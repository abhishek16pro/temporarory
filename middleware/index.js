import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import express from 'express';
import config from '../config/index.js';


export const configureCors = () => {
  return cors({
    origin: config.cors.origins,
    credentials: config.cors.credentials,
    optionsSuccessStatus: config.cors.optionsSuccessStatus,
  });
};


export const configureSecurity = () => {
  return [
    helmet(config.security.helmet),
    helmet.crossOriginResourcePolicy(config.security.helmet.crossOriginResourcePolicy),
  ];
};


export const configureBodyParsing = () => {
  return [
    express.json({ limit: '10mb' }),
    express.urlencoded({ extended: true, limit: '10mb' }),
    cookieParser(),
  ];
};


export const requestLogger = (req, res, next) => {
  if (config.logging.enableRequestLogging) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path} - ${req.ip}`);
  }
  next();
};


export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(config.logging.enableDetailedErrors && { stack: err.stack }),
    },
    timestamp: new Date().toISOString(),
  });
};


export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
      path: req.path,
      method: req.method,
    },
    timestamp: new Date().toISOString(),
  });
};


export const healthCheck = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.server.env,
    version: config.api.version,
  });
};


export const websocketInfo = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'WebSocket endpoint available',
    wsUrl: `ws://${config.server.host}:${config.server.port}`,
    timestamp: new Date().toISOString(),
  });
};
