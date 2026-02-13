# Makefile for CloudBSD Admin

.PHONY: all install build dev server clean test

all: install build

install:
	npm install

build:
	npm run build

dev:
	npm run dev

server:
	npm run server

test:
	npm test

clean:
	rm -rf dist
	rm -rf node_modules
