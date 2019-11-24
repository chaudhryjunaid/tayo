var express = require('express');
var router = express.Router();
const axios = require('axios');
const _ = require('lodash');

router.post('/push', async function(req, res, next) {
  try {
    const repoList = (process.env.REPO_LIST && process.env.REPO_LIST.split(',')) || [];
    const branch = process.env.GH_BRANCH_NAME || 'production';
    const noNotificationPusher = '';
    const data = JSON.parse(req.body.payload);
    console.log('Incoming github push event:', data);
    const repo = data.repository || '';
    const pusher = data.pusher || '';
    if ((repoList.indexOf(repo.name) !== -1) && (data.ref === `refs/heads/${branch}`) && (pusher.name !== noNotificationPusher) ) {
      const { commits, head_commit } = data;
      const commit = data.after;
      const headMessage = head_commit.message.replace(/\r?\n|\r/g,'');
      const isHotFix = headMessage.indexOf('hotfix') !== -1;
      let color = 'warning';
      let title = 'PR Merge Alert';
      if(isHotFix) {
        color = 'danger';
        title = 'HotFix Merge Alert';
      }
      const githubMsg = {
        'attachments': [
          {
            'color': color,
            'author_name': 'tayo',
            'title': title,
            'text': headMessage,
            'fields': [
              {
                'title': 'Branch',
                'value': branch,
                'short': true
              },
              {
                'title': 'To',
                'value': repo.full_name,
                'short': true
              },
              {
                'title': 'By',
                'value': pusher.name,
                'short': true
              },
              {
                'title': 'Link',
                'value': head_commit.url,
                'short': false
              }
            ]
          }
        ]
      };
      let response = await axios({
        method: 'post',
        url: process.env.HOTFIX_WEBHOOK,
        data: {
          text: '@channel'
        }
      });
      if (response.status !== 200) {
        return res.status(status).send('Slack error!');
      }
      response = await axios({
        method: 'post',
        url: process.env.HOTFIX_WEBHOOK,
        data: githubMsg
      });
      if (response.status !== 200) {
        return res.status(status).send('Slack error!');
      }
      console.log(`GH message sent for ${head_commit.message}`);
      console.log('Slack response: ', response.status);
    }
    return res.sendStatus(200);
  } catch(e) {
    console.log(e.message, e.stack);
    res.sendStatus(500);
  }
});

router.post('/pr', async function(req, res) {
  console.log('$$', req.body);
  const data = JSON.parse(req.body.payload);
  console.log('$$', data);
  const pr = data.pull_request || {};
  const repo = data.repository || '';
  console.log('PR title:', pr.title);
  console.log('Action:', data.action, ', Merged:', pr.merged);
  if ((data.action !== 'closed') || (pr.merged !== true)) {
    console.log('uninteresting pr action');
    res.sendStatus(200);
    return;
  }
  const releaseBranches = ['production', 'beta', 'staging'];
  const baseIndex = _.findIndex(releaseBranches, br => pr.base  && pr.base.ref && (pr.base.ref === br));
  const headIndex =  _.findIndex(releaseBranches, br => pr.head && pr.head.ref && (pr.head.ref === br));
  if((baseIndex >= 0) && (headIndex >= 0)) {
    let actionText, slackWebhook, color, thumb_url;
    console.log('Merged interesting branch...');
    const release = baseIndex < headIndex;
    if (release) {
      actionText =  'released';
      slackWebhook = process.env.RELEASE_WEBHOOK;
      thumb_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Creative-Tail-rocket.svg/128px-Creative-Tail-rocket.svg.png';
      color = 'good';
    } else {
      actionText = 'backmerged';
      slackWebhook = process.env.BACKMERGE_WEBHOOK;
      thumb_url =  '';
      color = '#cccccc';
    }
    const mergedBy = pr.merged_by && pr.merged_by.login;
    const pretext = repo.full_name + ': ' + releaseBranches[headIndex] + ' ' + actionText + ' to ' + releaseBranches[baseIndex] + ' by ' + mergedBy;
    const stats = pr.commits + ' commits, '+ pr.additions + ' additions, ' + pr.deletions + ' deletions, ' + pr.changed_files + ' changed files.';
    const githubMsg = {
      'attachments': [
        {
          'fallback': pretext,
          'color': color,
          'pretext': pretext,
          'title': '#' + data.number,
          'title_link': pr.html_url,
          'text': stats,
          'thumb_url': thumb_url
        }
      ]
    };
    let response = await axios({
      method: 'post',
      url: slackWebhook,
      data: {
        text: '@channel'
      }
    });
    if (response.status !== 200) {
      return res.status(status).send('Slack error!');
    }
    response = await axios({
      method: 'post',
      url: slackWebhook,
      data: githubMsg
    });
    if (response.status !== 200) {
      return res.status(status).send('Slack error!');
    }
    console.log('release/backmerge alert: ' + JSON.stringify(githubMsg));
  }
  return res.sendStatus(200);
});

module.exports = router;
