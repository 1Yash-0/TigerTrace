FROM python:3.11.9-slim

RUN apt-get update && apt-get install -y --no-install-recommends git curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# The Space only contains these two files; the application itself is cloned
# from the public TigerTrace repo at build time.
RUN git clone --depth 1 https://github.com/1Yash-0/TigerTrace.git tigertrace

WORKDIR /app/tigertrace/backend

# Public MDV6 detector weights are fetched at build time (no secret needed).
RUN mkdir -p TigerTrace/models/pretrained \
    && curl -L --fail --retry 3 -o TigerTrace/models/pretrained/MDV6-yolov9-c.onnx \
        "https://zenodo.org/api/records/15398270/files/MDV6-yolov9-c.onnx/content" \
    && echo "3db7988385714066c1515dde6ab56e4c  TigerTrace/models/pretrained/MDV6-yolov9-c.onnx" | md5sum -c - \
    && rm /tmp/* 2>/dev/null || true

RUN pip install --no-cache-dir -r requirements.txt

COPY start.sh /app/tigertrace/backend/start.sh
RUN chmod +x /app/start.sh \
    && chmod -R a+rwX /app

EXPOSE 7860
CMD ["/app/tigertrace/backend/start.sh"]
