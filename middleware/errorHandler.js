/**
 * Centralized Error Handling Middleware
 * Catches all unhandled errors and returns safe, consistent responses.
 */

/**
 * 404 Not Found handler.
 * Catches any request that doesn't match a defined route.
 */
function notFoundHandler(req, res, _next) {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found.`,
    requestId: req.requestId || null,
  });
}

/**
 * Global error handler.
 * Hides internal server error details from the client.
 */
function globalErrorHandler(err, req, res, _next) {
  // Log the full error internally
  console.error(`[Error] RequestId: ${req.requestId || 'N/A'}`, {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  // Handle CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Origin not allowed by CORS policy.',
      requestId: req.requestId || null,
    });
  }

  // Handle JSON parse errors
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: 'Invalid JSON in request body.',
      requestId: req.requestId || null,
    });
  }

  // Default: hide internal details from the client
  const statusCode = err.statusCode || err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  res.status(statusCode).json({
    success: false,
    error: statusCode === 500 ? 'Internal Server Error' : err.message,
    message: isProduction
      ? 'An unexpected error occurred. Please try again later.'
      : err.message,
    requestId: req.requestId || null,
  });
}

module.exports = {
  notFoundHandler,
  globalErrorHandler,
};
