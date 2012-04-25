const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;

function loadBuilder(filename, objects)
{
    let uidir = GLib.getenv('GNOME_TODO_UIDIR');
    if (!uidir)
        uidir = GLib.get_user_data_dir();

    let builder = new Gtk.Builder();
    builder.add_from_file(GLib.build_filenamev([uidir, filename]), objects);

    return builder;
}

Gtk.Button.prototype.setSymbolic = function(icon_name) {
    this.get_style_context().add_class('raised');

    let w = new Gtk.Image({ icon_name: icon_name, icon_size: Gtk.IconSize.MENU });
    w.show();
    this.add(w);
}
