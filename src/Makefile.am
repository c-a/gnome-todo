AM_CPPFLAGS = \
    -I$(top_builddir)/config \
    -I$(top_srcdir)	\
    -L$(top_srcdir)/src \
    -DGNOME_TODO_LIBDIR=\"$(libdir)\" \
    -DGNOME_TODO_DATADIR=\"$(datadir)\" \
    -DGNOME_TODO_PKGDATADIR=\"$(pkgdatadir)\" \
    -DGNOME_TODO_TOP_SRCDIR=\"$(abs_top_srcdir)\" \
    -DGNOME_TODO_BUILDDIR=\"$(abs_top_builddir)\"

girdir = $(pkgdatadir)/gir-1.0
typelibdir = $(pkglibdir)/girepository-1.0

BUILT_SOURCES =
EXTRA_DIST =
CLEANFILES =
pkglib_LTLIBRARIES =
INTROSPECTION_GIRS =
gir_DATA =
typelib_DATA =
libexec_PROGRAMS =
libexec_SCRIPTS =

# convenience command for doing Makefile variable substitutions in non-Makefile
# files (scripts, service files, etc.)
do_subst = sed -e 's|@abs_top_srcdir[@]|$(abs_top_srcdir)|g' \
               -e 's|@abs_top_builddir[@]|$(abs_top_builddir)|g' \
               -e 's|@srcdir[@]|$(srcdir)|g' \
               -e 's|@abs_builddir[@]|$(abs_builddir)|g' \
               -e 's|@localedir[@]|$(localedir)|g' \
               -e 's|@bindir[@]|$(bindir)|g' \
               -e 's|@libdir[@]|$(libdir)|g' \
               -e 's|@libexecdir[@]|$(libexecdir)|g' \
               -e 's|@pkglibdir[@]|$(pkglibdir)|g' \
               -e 's|@pkgdatadir[@]|$(pkgdatadir)|g' \
               -e 's|@GJS_CONSOLE[@]|$(GJS_CONSOLE)|g' \
               -e 's|@PACKAGE_NAME[@]|$(PACKAGE_NAME)|g' \
               -e 's|@PACKAGE_VERSION[@]|$(PACKAGE_VERSION)|g' \
               -e 's|@GETTEXT_PACKAGE[@]|$(GETTEXT_PACKAGE)|g'

include $(INTROSPECTION_MAKEFILE)
include Makefile-lib.am
include Makefile-js.am

gir_DATA += $(INTROSPECTION_GIRS)
typelib_DATA += $(gir_DATA:.gir=.typelib)

CLEANFILES += $(gir_DATA) $(typelib_DATA)

bin_SCRIPTS = gnome-todo
noinst_SCRIPTS = gnome-todo-uninstalled gnome-todo-debug

gnome-todo: gnome-todo.in
	$(AM_V_GEN) $(do_subst) $< > $@
	chmod +x $@
gnome-todo-uninstalled: gnome-todo-uninstalled.in
	$(AM_V_GEN) $(do_subst) $< > $@
	chmod +x $@
gnome-todo-debug: gnome-todo-debug.in
	$(AM_V_GEN) $(do_subst) $< > $@
	chmod +x $@

CLEANFILES += \
    gnome-todo \
    gnome-todo-uninstalled.in \
    gnome-todo-debug
EXTRA_DIST += \
    gnome-todo.in \
    gnome-todo-uninstalled.in \
    gnome-todo-debug.in
