/**
 * @openapi
 * /getPointsCampaigns:
 *   get:
 *     tags:
 *       - Misc
 *     description: |
 *       Returns points campaigns (see https://github.com/curvefi/curve-frontend/tree/main/packages/external-rewards/src)
 *     responses:
 *       200:
 *         description:
 */

import memoize from 'memoizee';
import { allBlockchainIds, fn } from '#root/utils/api.js';
import { Octokit } from '@octokit/rest';
import { sequentialPromiseMap } from '#root/utils/Async.js';
import { getNowTimestamp } from '#root/utils/Date.js';
import { removeNulls } from '#root/utils/Array.js';

const octokit = new Octokit({
  auth: process.env.GITHUB_FINE_GRAINED_PERSONAL_ACCESS_TOKEN,
  userAgent: process.env.GITHUB_API_UA,
});

const getCampaigns = memoize(async () => {
  const filePaths = await octokit.rest.repos.getContent({
    owner: 'curvefi',
    repo: 'curve-frontend',
    path: '/packages/external-rewards/src/campaigns',
  }).then(({ data }) => data.map(({ path }) => path).filter((path) => path.endsWith('.json')));

  const nowTs = getNowTimestamp();
  const campaigns = removeNulls(await sequentialPromiseMap(filePaths, async (filePath) => (
    octokit.rest.repos.getContent({
      owner: 'curvefi',
      repo: 'curve-frontend',
      path: filePath,
    }).then(({ data: { content } }) => {
      const jsonFile = Buffer.from(content, 'base64').toString();
      const campaignConfig = JSON.parse(jsonFile);

      const relevantCampaignPools = (campaignConfig.pools ?? []).filter(({
        tags,
        network,
        action,
        campaignStart,
        campaignEnd,
      }) => (
        tags.includes('points') &&
        allBlockchainIds.includes(network) &&
        (action === 'lp' || action === 'supply') &&
        Number(campaignStart) < nowTs &&
        nowTs < Number(campaignEnd)
      ));

      if (relevantCampaignPools.length === 0) return null;

      return {
        campaignName: campaignConfig.campaignName,
        platform: campaignConfig.platform,
        platformImageId: campaignConfig.platformImageId,
        dashboardLink: campaignConfig.dashboardLink,
        pools: relevantCampaignPools,
      };
    })
  )));

  return campaigns;
}, {
  maxAge: 10 * 60 * 1000,
  promise: true,
});

export default fn(async () => ({
  pointCampaigns: await getCampaigns(),
}), {
  maxAge: 60 * 60, // 1h
  cacheKey: 'getPointsCampaigns',
});
