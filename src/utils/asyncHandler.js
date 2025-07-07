
const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch(next);
  };
};

export default asyncHandler;




/*
const asyncHandler = (fn) => async (err, req, res) => {

    try {
        await fun(req, res, next)

    } catch (error) {

        res.status(error.code || 500).json({
            success: false,
            message: error.message
        })

    }
}
    */