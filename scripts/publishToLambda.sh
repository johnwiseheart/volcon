zip -rj index.zip lambda/*
aws lambda update-function-code --function-name volumeControl --zip-file fileb://index.zip
rm index.zip