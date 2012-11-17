SUBDIRS = icons

desktop_in_files = gnome-todo.desktop.in
desktopdir = $(datadir)/applications
desktop_DATA = $(desktop_in_files:.desktop.in=.desktop)

@INTLTOOL_DESKTOP_RULE@

%.ini: %.ini.in
	LC_ALL=C $(INTLTOOL_MERGE) -d -u -c $(top_builddir)/po/.intltool-merge-cache $(top_srcdir)/po $< $@

gsettingsschema_in_files = org.gnome.todo.gschema.xml.in
gsettings_SCHEMAS = $(gsettingsschema_in_files:.xml.in=.xml)
.PRECIOUS: $(gsettings_SCHEMAS)

iconsdir = $(pkgdatadir)/icons
dist_icons_DATA = \
    thumbnail-frame.png

gnome-todo.gresource: gnome-todo.gresource.xml $(shell glib-compile-resources --sourcedir=$(top_srcdir)/data --generate-dependencies $(top_srcdir)/data/gnome-todo.gresource.xml)
	$(AM_V_GEN) glib-compile-resources --target=$@ --sourcedir=$(top_srcdir)/data $(top_srcdir)/data/gnome-todo.gresource.xml

resourcedir = $(pkgdatadir)
dist_resource_DATA = gnome-todo.gresource

@INTLTOOL_XML_NOMERGE_RULE@
@GSETTINGS_RULES@

EXTRA_DIST= \
    gnome-todo.desktop \
    $(service_in_files) \
    $(desktop_in_files) \
    $(searchprovider_in_files) \
    $(gsettingsschema_in_files)
CLEANFILES = \
    gnome-todo.gresource \
    gschemas.compiled \
    $(desktop_DATA) \
    $(gsettings_SCHEMAS)
