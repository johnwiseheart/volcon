cd lambda
zip -r ../index.zip *
cd ..
aws lambda update-function-code --function-name volumeControl --zip-file fileb://index.zip
rm index.zip