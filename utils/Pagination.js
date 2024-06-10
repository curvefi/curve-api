import Request from '#root/utils/Request.js';

/**
 * Fetch paginated endpoints, returns an array of the pages' results.
 * A paginated endpoint is expected to have (names are optionally configurable)
 * properties `page`, `per_page` and `count` (retrieved page number; items per page; total items).
 * It must also have an array that holds results data (defaults to `data`).
 *
 * Example response of a compatible paginated endpoint:
 * ```
 * {
 *   "page": 1,
 *   "per_page": 100,
 *   "count": 6,
 *   "data": [...items],
 * }
 * ```
 *
 * Params:
 * - `url`: path without query parameters
 * - `data`: data that'll be url-encoded and passed as query parameters
 */
const DEFAULT_PAGINATION_PROPS = {
  PAGE: 'page',
  PER_PAGE: 'per_page',
  COUNT: 'count',
  DATA: 'data',
};

const fetchPages = async (url, data = {}, paginationPropsOverride = {}) => {
  const paginationProps = { ...DEFAULT_PAGINATION_PROPS, ...paginationPropsOverride };
  const fetchedPages = [];

  let page = 1;
  let count;

  do {
    const dataWithPaginationParams = {
      ...data,
      [paginationProps.PAGE]: page,
      [paginationProps.PER_PAGE]: data[paginationProps.PER_PAGE],
    }
    const result = await (await Request.get(url, dataWithPaginationParams)).json();

    fetchedPages.push(...result[paginationProps.DATA]);
    page = result[paginationProps.PAGE] + 1;
    count = result[paginationProps.COUNT];
  } while ((page - 1) * data[paginationProps.PER_PAGE] < count);

  return fetchedPages;
};

export {
  fetchPages,
};
