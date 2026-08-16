FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Environment variables
ENV CALLREMIND_API_URL=https://api.callremind.my/v1
ENV CALLREMIND_API_KEY=
ENV CALLREMIND_MCP_PORT=8921

# HTTP Stream (SSE) port for remote clients (ChatGPT)
EXPOSE 8921

# Command to run the MCP server (default stdio; override CMD to index-sse.js)
CMD ["node", "index.js"]
