const Gdk = imports.gi.Gdk;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;

function loadResource()
{
    let datadir = GLib.getenv('GNOME_TODO_DATADIR');
    try {
        let resource = Gio.resource_load(GLib.build_filenamev(
            [datadir, 'gnome-todo.gresource']));
          
        resource._register();
        return;
    } catch(e) {}

    let datadirs = GLib.get_system_data_dirs();

    let i = 0;
    while (datadirs[i] != null) {
        try {
          let resource = Gio.resource_load(GLib.build_filenamev(
              [datadirs[i], 'gnome-todo', 'gnome-todo.gresource']));
          
          resource._register();
          return;
        } catch(e) {}
        i++;
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

function alphaGtkWidget(widget) {
    widget.override_background_color(0,
        new Gdk.RGBA({ red: 0, green: 0, blue: 0, alpha: 0 }));
}
