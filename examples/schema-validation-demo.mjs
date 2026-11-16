#!/usr/bin/env node

import { from } from '../src/index.mjs';

console.log('🔍 Schema Validation Demo\n');

// Example 1: Valid Docker Compose
console.log('1. Valid Docker Compose:');
const validCompose = `
version: '3.8'
services:
  web:
    image: nginx:latest
    ports:
      - "8080:80"
`;

try {
  const result = await from.compose(validCompose);
  console.log('✅ Valid - Parsed successfully');
  console.log(`   Services: ${result.metadata.serviceCount}\n`);
} catch (error) {
  console.log(`❌ Error: ${error.message}\n`);
}

// Example 2: Invalid Docker Compose (missing image/build)
console.log('2. Invalid Docker Compose (missing image/build):');
const invalidCompose = `
version: '3.8'
services:
  web:
    ports:
      - "80:80"
`;

try {
  const result = await from.compose(invalidCompose);
  console.log('✅ Parsed successfully\n');
} catch (error) {
  console.log(`❌ Expected error: ${error.message}\n`);
}

// Example 3: Docker Compose with security issues
console.log('3. Docker Compose with security issues (strict mode):');
const securityCompose = `
version: '3.8'
services:
  db:
    image: postgres:14
    ports:
      - "5432:5432"
    environment:
      POSTGRES_PASSWORD: "hardcoded_secret"
`;

try {
  const result = await from.compose(securityCompose, { strict: true });
  console.log('✅ Parsed successfully\n');
} catch (error) {
  console.log(`❌ Security issues detected: ${error.message}\n`);
}

// Example 4: Valid Kubernetes Deployment
console.log('4. Valid Kubernetes Deployment:');
const validK8s = `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.14.2
        ports:
        - containerPort: 80
        resources:
          limits:
            cpu: 100m
            memory: 128Mi
`;

try {
  const result = await from.k8s(validK8s);
  console.log('✅ Valid - Parsed successfully');
  console.log(`   Kind: ${result.metadata.kind}\n`);
} catch (error) {
  console.log(`❌ Error: ${error.message}\n`);
}

// Example 5: Kubernetes with :latest tag (strict mode)
console.log('5. Kubernetes with :latest tag (strict mode):');
const latestK8s = `
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
spec:
  containers:
  - name: test
    image: nginx:latest
`;

try {
  const result = await from.k8s(latestK8s, { strict: true });
  console.log('✅ Parsed successfully\n');
} catch (error) {
  console.log(`❌ Best practice issue: ${error.message}\n`);
}

// Example 6: Valid Terraform HCL
console.log('6. Valid Terraform HCL:');
const validTerraform = `
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t2.micro"
}

variable "region" {
  default = "us-west-2"
}
`;

try {
  const result = await from.terraformHcl(validTerraform);
  console.log('✅ Valid - Parsed successfully');
  console.log(`   Resources: ${result.data._metadata.resourceCount}\n`);
} catch (error) {
  console.log(`❌ Error: ${error.message}\n`);
}

// Example 7: Invalid Terraform (wrong label count)
console.log('7. Invalid Terraform (wrong label count):');
const invalidTerraform = `
resource "aws_instance" {
  ami = "ami-123"
}
`;

try {
  const result = await from.terraformHcl(invalidTerraform);
  console.log('✅ Parsed successfully\n');
} catch (error) {
  console.log(`❌ Expected error: ${error.message}\n`);
}

console.log('✨ Demo complete!\n');
console.log('💡 Tips:');
console.log('  - Use { validate: false } to skip validation');
console.log('  - Use { strict: true } to enforce security checks');
console.log('  - Validation is enabled by default for safety');
