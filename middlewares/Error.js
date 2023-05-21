const ErrorMiddleware = (err, req, res, next) => {
  err.statusCode ||= 500;

  err.message ||= "Internal Server Error!";

  res.status(err.statusCode).json({
    success: false,
    message: err.message,
  });
};

export default ErrorMiddleware;
