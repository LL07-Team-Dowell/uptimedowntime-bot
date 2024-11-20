# Use Node.js as the base image
FROM node:18

# Set the working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the bot's code
COPY . .

# Start the bot
CMD ["npm", "run","dev"]
