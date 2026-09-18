"""
Part 3 — Geospatial Intelligence Service
"""
import math
import numpy as np
from sqlalchemy.orm import Session
from database import Capture, Tiger

try:
    from shapely.geometry import MultiPoint, Point, mapping
    from shapely.ops import unary_union
    SHAPELY_AVAILABLE = True
except ImportError:
    SHAPELY_AVAILABLE = False
    print("[WARN] shapely not installed. Using bounding-box fallback.")

def _area_sq_km(polygon_coords: list) -> float:
    """Shoelace formula on lat/lon → approximate km² (naive)"""
    if len(polygon_coords) < 3:
        return 0.0
    KM = 111.0
    n = len(polygon_coords)
    area = 0.0
    for i in range(n):
        j = (i + 1) % n
        lat_i, lon_i = polygon_coords[i]
        lat_j, lon_j = polygon_coords[j]
        area += lon_i * lat_j
        area -= lon_j * lat_i
    return round(abs(area) / 2.0 * KM * KM, 2)

def _mcp_polygon(points: list[tuple]) -> list[list[float]]:
    if not SHAPELY_AVAILABLE or len(points) < 3:
        lats = [p[0] for p in points]
        lons = [p[1] for p in points]
        return [
            [min(lats), min(lons)], [min(lats), max(lons)],
            [max(lats), max(lons)], [max(lats), min(lons)],
        ]
    mp = MultiPoint([(lon, lat) for lat, lon in points])
    hull = mp.convex_hull
    if hull.is_empty:
        return []
    if hull.geom_type == 'Point':
        return [[hull.y, hull.x]]
    if hull.geom_type == 'LineString':
        return [[p[1], p[0]] for p in hull.coords]
    return [[p[1], p[0]] for p in hull.exterior.coords]

def get_tiger_home_ranges(db: Session) -> list[dict]:
    tigers = db.query(Tiger).all()
    results = []
    for tiger in tigers:
        captures = db.query(Capture).filter(Capture.tiger_id == tiger.tiger_id).all()
        if not captures:
            continue
        points = [(c.latitude, c.longitude) for c in captures]
        lats = [p[0] for p in points]
        lons = [p[1] for p in points]
        centroid_lat = round(float(np.mean(lats)), 5)
        centroid_lon = round(float(np.mean(lons)), 5)
        polygon = _mcp_polygon(points)
        area = _area_sq_km(polygon)
        stations_visited = list({c.station_id for c in captures})
        zone_counts = {}
        for c in captures:
            zone_counts[c.zone] = zone_counts.get(c.zone, 0) + 1
        results.append({
            "tiger_id": tiger.tiger_id,
            "name": tiger.name,
            "sex": tiger.sex,
            "total_captures": tiger.total_captures,
            "centroid": [centroid_lat, centroid_lon],
            "polygon": polygon,
            "area_sq_km": area,
            "area_method": "MCP (Convex Hull)",
            "stations_visited": stations_visited,
            "zone_breakdown": zone_counts,
            "last_seen": max(c.timestamp for c in captures).isoformat(),
        })
    return results

def get_territory_overlaps(db: Session) -> list[dict]:
    if not SHAPELY_AVAILABLE:
        return []
    tigers = db.query(Tiger).all()
    polygons = {}
    for tiger in tigers:
        captures = db.query(Capture).filter(Capture.tiger_id == tiger.tiger_id).all()
        points = [(c.longitude, c.latitude) for c in captures]
        if len(points) >= 3:
            polygons[tiger.tiger_id] = MultiPoint(points).convex_hull
    overlaps = []
    keys = list(polygons.keys())
    for i in range(len(keys)):
        for j in range(i + 1, len(keys)):
            a_id, b_id = keys[i], keys[j]
            poly_a, poly_b = polygons[a_id], polygons[b_id]
            if poly_a.intersects(poly_b):
                intersection = poly_a.intersection(poly_b)
                inter_coords = []
                if intersection.geom_type == 'Polygon':
                    inter_coords = [[p[1], p[0]] for p in intersection.exterior.coords]
                overlap_km2 = _area_sq_km(inter_coords) if inter_coords else 0.0
                overlaps.append({
                    "tiger_a": a_id,
                    "tiger_b": b_id,
                    "overlap_area_sq_km": overlap_km2,
                })
    return overlaps
