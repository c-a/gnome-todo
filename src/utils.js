const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;

function loadResource()
{
    let datadirs = GLib.get_system_data_dirs();
    let datadir = GLib.getenv('GNOME_TODO_DATADIR');

    let i = 0;
    if (!datadir)
        datadir = datadirs[i++];

    while (datadir != null) {
            let resource = Gio.resource_load(GLib.build_filenamev([datadir, 'gnome-todo.gresource']));
            resource._register();
            return;
        datadir = datadirs[i++];
    }

    throw('Couldn\'t load resource file');
}

function loadCssProviderFromResource(path)
{
    let bytes = Gio.resources_lookup_data(path, 0);
    
    let provider = new Gtk.CssProvider();
    provider.load_from_data(bytes);
    
    return provider;
}

Gtk.Button.prototype.setSymbolic = function(icon_name) {
    this.get_style_context().add_class('raised');

    let w = new Gtk.Image({ icon_name: icon_name, icon_size: Gtk.IconSize.MENU });
    w.show();
    this.add(w);
}
