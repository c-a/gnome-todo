SUBDIRS = icons

desktopdir = $(datadir)/applications
desktop_DATA = gnome-todo.desktop

@INTLTOOL_DESKTOP_RULE@

gsettingsschema_in_files = org.gnome.todo.gschema.xml.in
gsettings_SCHEMAS = $(gsettingsschema_in_files:.xml.in=.xml)
.PRECIOUS: $(gsettings_SCHEMAS)

@GSETTINGS_RULES@

resource_files = $(shell $(GLIB_COMPILE_RESOURCES) --sourcedir=$(srcdir) --generate-dependencies $(srcdir)/gnome-todo.gresource.xml)
gnome-todo.gresource: gnome-todo.gresource.xml $(resource_files)
	$(AM_V_GEN) glib-compile-resources --target=$@ --sourcedir=$(srcdir) $<

resourcedir = $(pkgdatadir)
resource_DATA = gnome-todo.gresource

@INTLTOOL_XML_NOMERGE_RULE@

EXTRA_DIST= \
    gnome-todo.desktop \
    $(desktop_in_files) \
    $(gsettingsschema_in_files) \
    $(resource_files)

CLEANFILES = \
    gnome-todo.gresource \
    gschemas.compiled \
    $(desktop_DATA) \
    $(gsettings_SCHEMAS)
