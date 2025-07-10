# ---- base image ----
FROM node:18-alpine          # small, secure

# install the MCP connector CLI once at build-time
RUN npm install -g @typingmind/mcp

# get the secret from Render’s env tab
ENV MCP_AUTH_TOKEN=${MCP_AUTH_TOKEN}

# start the connector; bind to all interfaces and Render’s injected $PORT
CMD ["sh","-c","mcp $MCP_AUTH_TOKEN --host 0.0.0.0 --port ${PORT}"]
