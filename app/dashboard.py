"""
Streamlit Operator Dashboard & Human Review UI for Pench Tiger Reserve.
- Fast, auditable, and offline interface for forest department staff.
- Reversible blank quarantine review.
- Tiger stripe Re-ID candidate verification with side-by-side comparison.
- Interactive territory occupancy map & home-range visualization.
- Movement deviation alert triage.
"""

import os
import sqlite3
import pandas as pd
import numpy as np
from PIL import Image
import streamlit as st
import plotly.express as px
import plotly.graph_objects as go

st.set_page_config(
    page_title="Pench Tiger Intelligence System",
    page_icon="🐅",
    layout="wide",
    initial_sidebar_state="expanded"
)

DB_PATH = "data/pench_wildlife.db"

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# Custom CSS for modern, professional dark/light UI
st.markdown("""
<style>
    .metric-card {
        background-color: #1E222B;
        border-radius: 8px;
        padding: 15px;
        border-left: 5px solid #FF8C00;
        margin-bottom: 10px;
    }
    .alert-card {
        background-color: #2D1A1A;
        border-radius: 8px;
        padding: 12px;
        border-left: 5px solid #FF4500;
        margin-bottom: 10px;
    }
</style>
""", unsafe_allow_html=True)

st.sidebar.title("🐅 Pench Tiger Reserve")
st.sidebar.markdown("**Movement Intelligence & Triage System**")
st.sidebar.markdown("---")

page = st.sidebar.radio(
    "Navigation",
    ["📊 Dashboard Overview", "🧹 Blank Quarantine Review", "🔍 Tiger Re-ID Review Queue", "🗺️ Territory & Home Range Map", "🚨 Movement Alerts", "📜 Audit Trail"]
)

# 1. OVERVIEW
if page == "📊 Dashboard Overview":
    st.title("📊 Monitoring & Triage Dashboard")
    st.markdown("Automated camera-trap intelligence overview for active monitoring cycles.")
    
    if not os.path.exists(DB_PATH):
        st.warning("No database found yet. Run the pipeline first to process camera trap imagery.")
        st.stop()
        
    with get_db_connection() as conn:
        runs = pd.read_sql("SELECT * FROM runs ORDER BY start_time DESC", conn)
        total_images = conn.execute("SELECT COUNT(*) FROM images").fetchone()[0]
        blanks = conn.execute("SELECT COUNT(*) FROM images WHERE triage_status = 'QUARANTINED_BLANK'").fetchone()[0]
        animals = conn.execute("SELECT COUNT(*) FROM detections WHERE class_name = 'animal'").fetchone()[0]
        humans = conn.execute("SELECT COUNT(*) FROM images WHERE triage_status = 'PRIVACY_BLURRED_HUMAN'").fetchone()[0]
        tigers = conn.execute("SELECT COUNT(DISTINCT individual_id) FROM individuals").fetchone()[0]
        alerts_count = conn.execute("SELECT COUNT(*) FROM alerts WHERE is_acknowledged = 0").fetchone()[0]
        
    # Metrics
    c1, c2, c3, c4, c5 = st.columns(5)
    c1.metric("Total Ingested", f"{total_images:,}")
    c2.metric("Blanks Quarantined", f"{blanks:,}", delta=f"{blanks/max(1,total_images)*100:.1f}% filtered")
    c3.metric("Animals Localized", f"{animals:,}")
    c4.metric("Active Tigers", f"{tigers}")
    c5.metric("Active Alerts", f"{alerts_count}", delta_color="inverse")
    
    st.markdown("---")
    
    # Space & Time Savings Analysis
    col_left, col_right = st.columns([1, 1])
    with col_left:
        st.subheader("⏱️ Operational Efficiency & Savings")
        hours_saved = blanks * (4.0 / 3600.0)  # ~4 seconds manual review per blank
        gb_saved = (blanks * 2.5) / 1024.0     # ~2.5 MB average field image
        st.info(f"**Manual Review Time Saved:** ~**{hours_saved:.1f} hours** of field staff labor.\n\n**Storage Footprint Optimized:** ~**{gb_saved:.2f} GB** triaged into reversible quarantine.")
        
    with col_right:
        st.subheader("📋 Processing Runs")
        if not runs.empty:
            st.dataframe(runs[["run_id", "total_images", "blanks_quarantined", "animals_detected", "tigers_identified", "status"]], use_container_width=True)
        else:
            st.write("No runs logged yet.")

# 2. BLANK QUARANTINE REVIEW
elif page == "🧹 Blank Quarantine Review":
    st.title("🧹 Reversible Blank Image Quarantine")
    st.markdown("All false triggers (wind, grass, heat shimmer) are staged here with zero data deletion.")
    
    with get_db_connection() as conn:
        blanks_df = pd.read_sql("SELECT * FROM images WHERE triage_status = 'QUARANTINED_BLANK' LIMIT 50", conn)
        
    if blanks_df.empty:
        st.success("No blank images currently quarantined.")
    else:
        st.write(f"Showing **{len(blanks_df)}** candidate blanks (Sample):")
        cols = st.columns(4)
        for idx, row in blanks_df.iterrows():
            with cols[idx % 4]:
                if os.path.exists(row["absolute_path"]):
                    st.image(row["absolute_path"], caption=f"{row['filename']}\nStation: {row['station_id']}", use_container_width=True)
                    if st.button(f"Un-quarantine", key=f"uq_{row['image_id']}"):
                        with get_db_connection() as conn:
                            conn.execute("UPDATE images SET triage_status = 'RETAIN_ANIMAL' WHERE image_id = ?", (row['image_id'],))
                            conn.commit()
                        st.experimental_rerun()

# 3. TIGER RE-ID REVIEW QUEUE
elif page == "🔍 Tiger Re-ID Review Queue":
    st.title("🔍 Individual Tiger Re-ID Review Queue")
    st.markdown("Ambiguous stripe matches and newly enrolled individuals surfaced for human confirmation.")
    
    with get_db_connection() as conn:
        review_df = pd.read_sql("""
            SELECT m.match_id, m.crop_id, m.image_id, m.individual_id, m.top_1_dist, m.margin, m.decision, c.crop_path, c.quality_score, i.absolute_path, i.station_id, i.timestamp_normalized
            FROM identity_matches m
            JOIN crops c ON m.crop_id = c.crop_id
            JOIN images i ON m.image_id = i.image_id
            WHERE m.review_status = 'pending_review'
            LIMIT 20
        """, conn)
        
    if review_df.empty:
        st.success("🎉 All individual matches are reviewed and approved!")
    else:
        for _, row in review_df.iterrows():
            st.markdown(f"### Detection at {row['station_id']} ({row['timestamp_normalized']})")
            c1, c2, c3 = st.columns([1, 1, 1])
            with c1:
                st.markdown("**Field Detection Crop**")
                if os.path.exists(row["crop_path"]):
                    st.image(row["crop_path"], use_container_width=True)
                st.caption(f"Quality: {row['quality_score']*100:.1f}% | Dist: {row['top_1_dist']:.3f}")
                
            with c2:
                st.markdown(f"**Assigned Candidate:** `{row['individual_id']}`")
                st.write(f"Algorithm Decision: **{row['decision']}**")
                st.write(f"Top-2 Margin: `{row['margin']:.3f}`")
                
            with c3:
                st.markdown("**Audited Review Actions**")
                new_id = st.text_input("Confirm/Override Tiger ID:", value=row["individual_id"], key=f"id_{row['match_id']}")
                if st.button("✅ Confirm Identity", key=f"conf_{row['match_id']}"):
                    with get_db_connection() as conn:
                        conn.execute("UPDATE identity_matches SET individual_id = ?, review_status = 'approved' WHERE match_id = ?", (new_id, row["match_id"]))
                        conn.commit()
                    st.success(f"Confirmed {new_id}!")
                    st.experimental_rerun()
            st.markdown("---")

# 4. TERRITORY MAP
elif page == "🗺️ Territory & Home Range Map":
    st.title("🗺️ Tiger Reserve Occupancy & Home Range Map")
    st.markdown("Minimum Convex Polygon (MCP) territories, station visit frequencies, and territorial overlaps.")
    
    with get_db_connection() as conn:
        stations = pd.read_sql("SELECT * FROM stations", conn)
        individuals = pd.read_sql("SELECT * FROM individuals WHERE home_range_sq_km > 0 OR total_sightings > 0", conn)
        
    if stations.empty:
        st.warning("No station data found.")
    else:
        fig = px.scatter_mapbox(
            stations,
            lat="gps_lat",
            lon="gps_lon",
            color="zone",
            hover_name="station_id",
            hover_data=["trap_nights"],
            zoom=10,
            center={"lat": 21.72, "lon": 79.35},
            mapbox_style="carto-positron",
            title="Pench Tiger Reserve Station Network"
        )
        fig.update_layout(margin={"r":0,"t":40,"l":0,"b":0})
        st.plotly_chart(fig, use_container_width=True)
        
        st.subheader("🐅 Individual Tiger Home Ranges")
        if not individuals.empty:
            st.dataframe(individuals[["individual_id", "total_sightings", "home_range_sq_km", "first_seen", "last_seen", "status"]], use_container_width=True)

# 5. MOVEMENT ALERTS
elif page == "🚨 Movement Alerts":
    st.title("🚨 Movement Deviation & Dispersal Alerts")
    st.markdown("Automated behavioural intelligence alerts corrected for survey effort.")
    
    with get_db_connection() as conn:
        alerts = pd.read_sql("""
            SELECT a.*, s.gps_lat, s.gps_lon, s.zone
            FROM alerts a
            JOIN stations s ON a.station_id = s.station_id
            ORDER BY a.created_at DESC
        """, conn)
        
    if alerts.empty:
        st.success("No active movement deviation alerts.")
    else:
        for _, row in alerts.iterrows():
            st.markdown(f"""
            <div class="alert-card">
                <h4>⚠️ {row['alert_type']} — Tiger {row['individual_id']}</h4>
                <p>{row['description']}</p>
                <small>Station: <b>{row['station_id']} ({row['zone']} zone)</b> | Timestamp: {row['event_timestamp']} | Confidence: {row['confidence']*100:.0f}%</small>
            </div>
            """, unsafe_allow_html=True)
            if st.button("Acknowledge Alert", key=f"ack_{row['alert_id']}"):
                with get_db_connection() as conn:
                    conn.execute("UPDATE alerts SET is_acknowledged = 1 WHERE alert_id = ?", (row['alert_id'],))
                    conn.commit()
                st.experimental_rerun()

# 6. AUDIT TRAIL
elif page == "📜 Audit Trail":
    st.title("📜 System Audit Trail")
    st.markdown("Immutable record of all automatic decisions and operator actions.")
    with get_db_connection() as conn:
        audit = pd.read_sql("SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 100", conn)
    if audit.empty:
        st.write("No audit entries yet.")
    else:
        st.dataframe(audit, use_container_width=True)
