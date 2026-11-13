FROM node:22-alpine
WORKDIR /app
COPY receiver/ ./
ENV NODE_ENV=production
ENV PORT=3000
ENV KINGWO_TCP_PORT=5001
EXPOSE 3000 5001
CMD ["node","server.js"]
