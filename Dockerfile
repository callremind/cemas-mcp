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

# Command to run the MCP server
CMD ["node", "index.js"]
