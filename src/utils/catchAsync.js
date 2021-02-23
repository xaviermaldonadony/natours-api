// fn returns a promise thats why we can use catch
module.exports = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next)
    // simplify, pass the function and it will be called with the param that the callback receives
    // fn(req, res, next).catch((err) => next(err))
  }
}
