dnl -*- mode: m4 -*-
AC_PREREQ(2.63)
AC_INIT([gnome-todo],[0.0.1],[],[gnome-todo])

AM_CONFIG_HEADER(config/config.h)
AC_CONFIG_SRCDIR([src/main.js])
AC_CONFIG_MACRO_DIR([m4])
AC_CONFIG_AUX_DIR([config])

m4_ifdef([AM_SILENT_RULES],[AM_SILENT_RULES([yes])])

AC_CANONICAL_TARGET

# require automake 1.11
AM_INIT_AUTOMAKE([1.11 dist-xz no-dist-gzip tar-ustar foreign])
AM_MAINTAINER_MODE([enable])

GETTEXT_PACKAGE=AC_PACKAGE_NAME
AC_SUBST(GETTEXT_PACKAGE)
AC_DEFINE_UNQUOTED(GETTEXT_PACKAGE,"$GETTEXT_PACKAGE",[The name of the gettext domain])
IT_PROG_INTLTOOL(0.40.0)
PKG_PROG_PKG_CONFIG([0.22])

GOBJECT_INTROSPECTION_REQUIRE([0.9.6])

## don't rerun to this point if we abort
AC_CACHE_SAVE

AC_PROG_CC
AM_PROG_CC_C_O
AC_PROG_CXX
AC_ISC_POSIX
AC_HEADER_STDC

# no stupid static libraries
AM_DISABLE_STATIC
# enable libtool
AC_PROG_LIBTOOL
# avoid libtool for LTCOMPILE, use it only to link

## don't rerun to this point if we abort
AC_CACHE_SAVE

GLIB_GSETTINGS

AC_CHECK_LIBM
AC_SUBST(LIBM)

EVINCE_MIN_VERSION=3.3.0
GLIB_MIN_VERSION=2.31.6
GTK_MIN_VERSION=3.9.3
GOBJECT_INTROSPECTION_MIN_VERSION=1.31.6
GOA_MIN_VERSION=3.2.0
SOUP_MIN_VERSION=2.40.0

PKG_CHECK_MODULES(TODO,
                  gjs-1.0
                  glib-2.0 >= $GLIB_MIN_VERSION
                  gobject-introspection-1.0 >= $GOBJECT_INTROSPECTION_MIN_VERSION
                  gtk+-3.0 >= $GTK_MIN_VERSION
                  gnome-desktop-3.0
                  goa-1.0 >= $GOA_MIN_VERSION
                  libsoup-2.4 >= $SOUP_MIN_VERSION)

LIBGD_INIT([
    gtk-hacks
    gir
    header-bar
    main-view
    main-icon-view
    notification
])

GLIB_COMPILE_RESOURCES=`$PKG_CONFIG --variable glib_compile_resources gio-2.0`
AC_SUBST(GLIB_COMPILE_RESOURCES)

GJS_CONSOLE=`$PKG_CONFIG --variable=gjs_console gjs-1.0`
AC_SUBST(GJS_CONSOLE)

AC_CONFIG_FILES([
    Makefile
    libgd/Makefile
    src/Makefile
    data/Makefile
    data/icons/Makefile
    data/gnome-todo.desktop.in
    po/Makefile.in
])

AC_OUTPUT

dnl ==========================================================================
echo "

        gnome-todo $VERSION
        ==================

        prefix:    ${prefix}
        compiler:  ${CC}

        Now type 'make' to build $PACKAGE
"
