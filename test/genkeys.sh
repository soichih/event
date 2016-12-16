echo "generating auth keys"
openssl genrsa -out auth.key 2048
chmod 600 auth.key
openssl rsa -in auth.key -pubout > auth.pub

echo "generating test user jwt with the key"
/home/hayashis/git/auth/bin/auth.js issue --scopes '{ "sca": ["user"] }' --sub 'test' --out test.jwt --key auth.key
