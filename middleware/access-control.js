import { IS_DEV } from "#root/constants/AppConstants.js";

export default (req, res, next) => {
  if (IS_DEV) next();
  else if (req.header('X-Cloudfront-Secret') === process.env.CLOUDFRONT_SECRET) next();
  else res.status(400).send('Direct access not allowed');
};
