# tayo

This is repo is to maintain AWS Lambda function for Tayo Slack Bot.

To push code to AWS Lambda:
- Clone this repo
- Create a file `publish.sh` file outsite the folder of this repo.
- copy / paste this script in `publish.sh`.
```
rm tayo.zip
cd tayo
zip -r ../tayo.zip * -x /*.git/*
cd .. 
aws lambda update-function-code --function-name tayo --zip-file fileb://tayo.zip
```
- Install AWS CLI on your machine.
- Login into your AWS Account and you should already have Lambda Function created in that account.
- Run "`sh publish.sh`", all changes to AWS and Lambda Function will be published.
