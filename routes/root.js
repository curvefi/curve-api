const MAX_AGE = 30 * 24 * 60 * 60;

export default (_, res) => {
  res.setHeader('Cache-Control', `max-age=${MAX_AGE}, s-maxage=${MAX_AGE}, stale-while-revalidate`);
  res.status(200).send('API docs: https://github.com/curvefi/curve-api');
};
