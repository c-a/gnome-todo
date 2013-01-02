const Gdk = imports.gi.Gdk;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;

const Lang = imports.lang;
const Signals = imports.signals;


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

const BaseManager = new Lang.Class({
    Name: 'BaseManager',

    _init: function() {
        this._items = {};
    },

    getItemById: function(id) {
        let retval = this._items[id];

        if (!retval)
            retval = null;

        return retval;
    },

    addItem: function(item) {
        item._manager = this;

        let oldItem = this._items[item.id];

        this._items[item.id] = item;
        if (oldItem)
            this.emit('item-updated', item);
        else
            this.emit('item-added', item);
    },

    getItems: function() {
        return this._items;
    },

    getItemsCount: function() {
        return Object.keys(this._items).length;
    },

    removeItem: function(item) {
        this.removeItemById(item.id);
    },

    removeItemById: function(id) {
        let item = this._items[id];

        if (item) {
            delete this._items[id];
            this.emit('item-removed', item);
            item._manager = null;
        }
    },

    clear: function() {
        this._items = {};
        this.emit('clear');
    },

    forEachItem: function(func) {
        for (idx in this._items)
            func(this._items[idx]);
    },

    processNewItems: function(newItems) {
        let oldItems = this.getItems();

        for (idx in oldItems) {
            let item = oldItems[idx];

            // if old items are not found in the new array,
            // remove them
            if (!newItems[idx] && !item.builtin)
                this.removeItem(oldItems[idx]);
        }

        for (idx in newItems) {
            // if new items are not found in the old array,
            // add them
            if (!oldItems[idx])
                this.addItem(newItems[idx]);
        }

        // TODO: merge existing item properties with new values
    }
});
Signals.addSignalMethods(BaseManager.prototype)