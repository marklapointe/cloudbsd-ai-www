# Makefile for CloudBSD Admin

.PHONY: all install build dev server clean test install-freebsd

PREFIX?=/usr/local
WWWDIR?=$(PREFIX)/www/cloudbsd-admin
ETCDIR?=$(PREFIX)/etc/cloudbsd/admin-panel
RCDIR?=$(PREFIX)/etc/rc.d

all: install-deps build

install-deps:
	npm install

install: build
	@echo "Installing for FreeBSD..."
	mkdir -p $(DESTDIR)$(WWWDIR)
	mkdir -p $(DESTDIR)$(ETCDIR)
	mkdir -p $(DESTDIR)$(RCDIR)
	cp -R dist $(DESTDIR)$(WWWDIR)/
	cp -R server $(DESTDIR)$(WWWDIR)/
	cp package.json $(DESTDIR)$(WWWDIR)/
	cp package-lock.json $(DESTDIR)$(WWWDIR)/
	# Install production dependencies only for backend
	cd $(DESTDIR)$(WWWDIR) && npm install --omit=dev
	# Install config
	cp etc/config.json $(DESTDIR)$(ETCDIR)/config.json.sample
	# Install RC script
	sed -e "s|/usr/local/www/cloudbsd-admin|$(WWWDIR)|g" \
	    -e "s|/usr/local/etc/cloudbsd/admin-panel/config.json|$(ETCDIR)/config.json|g" \
	    pkg/cloudbsd-admin.rc.in > $(DESTDIR)$(RCDIR)/cloudbsd-admin
	chmod 555 $(DESTDIR)$(RCDIR)/cloudbsd-admin
	service cloudbsd-admin enable
	service cloudbsd-admin start


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
