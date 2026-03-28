# Makefile for CloudBSD Admin (Unified Frontend + Backend)

.PHONY: all install build dev start clean test

PREFIX?=/usr/local
APPDIR?=$(PREFIX)/www/cloudbsd-admin
ETCDIR?=$(PREFIX)/etc/cloudbsd/admin
RCDIR?=$(PREFIX)/etc/rc.d

all: install-deps build

install-deps:
	npm install

install: build
	@echo "Installing CloudBSD Admin (unified application)..."
	mkdir -p $(DESTDIR)$(APPDIR)
	mkdir -p $(DESTDIR)$(ETCDIR)
	mkdir -p $(DESTDIR)$(RCDIR)
	cp -R dist $(DESTDIR)$(APPDIR)/
	cp -R server $(DESTDIR)$(APPDIR)/
	cp -R src $(DESTDIR)$(APPDIR)/
	cp package.json $(DESTDIR)$(APPDIR)/
	cp package-lock.json $(DESTDIR)$(APPDIR)/
	cp tsconfig.json $(DESTDIR)$(APPDIR)/
	# Install production dependencies
	cd $(DESTDIR)$(APPDIR) && npm install --omit=dev
	# Install config
	cp etc/config.json $(DESTDIR)$(ETCDIR)/config.json.sample
	# Install RC script
	sed -e "s|/usr/local/www/cloudbsd-admin|$(APPDIR)|g" \
	    -e "s|/usr/local/etc/cloudbsd/admin/config.json|$(ETCDIR)/config.json|g" \
	    pkg/cloudbsd-admin.rc.in > $(DESTDIR)$(RCDIR)/cloudbsd-admin
	chmod 555 $(DESTDIR)$(RCDIR)/cloudbsd-admin
	service cloudbsd-admin enable
	service cloudbsd-admin start

build:
	npm run build

dev:
	npm run dev

start:
	npm start

test: build
	npm test

clean:
	rm -rf dist
	rm -rf node_modules
