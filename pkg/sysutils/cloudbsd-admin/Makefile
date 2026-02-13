PORTNAME=	cloudbsd-admin
DISTVERSION=	0.1.0
CATEGORIES=	sysutils

MAINTAINER=	admin@cloudbsd.org
COMMENT=	Admin panel for CloudBSD infrastructure
WWW=		https://github.com/cloudbsd/cloudbsd-admin

LICENSE=	MIT

RUN_DEPENDS=	node>=18:www/node \
		npm>=9:www/npm

USES=		pkgconfig

NO_BUILD=	yes

do-install:
	${MKDIR} ${STAGEDIR}${PREFIX}/www/cloudbsd-admin
	(cd ${WRKSRC} && ${COPYTREE_SHARE} . ${STAGEDIR}${PREFIX}/www/cloudbsd-admin)

.include <bsd.port.mk>
