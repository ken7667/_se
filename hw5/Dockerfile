# 通用開發環境 (對應作業第 1 項：docker 學習)
# 內含 Node.js / Python / Rust 工具鏈，可用來開發本專案的 api 服務
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Asia/Taipei

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc g++ make \
    curl git vim tmux \
    python3 python3-pip python3-venv \
    nodejs npm \
    ca-certificates sudo \
    && rm -rf /var/lib/apt/lists/*

ENV RUSTUP_HOME=/usr/local/rustup \
    CARGO_HOME=/usr/local/cargo \
    PATH=/usr/local/cargo/bin:$PATH

RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y \
    && rustup --version && cargo --version && rustc --version

WORKDIR /workspace

CMD ["sleep", "infinity"]
