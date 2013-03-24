const Gdk = imports.gi.Gdk;
const GdPrivate = imports.gi.GdPrivate;
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

function dateTimeFromISO8601(string) {
    let [res, timeval] = GLib.TimeVal.from_iso8601(string);
    if (!res)
        return null;

    return GLib.DateTime.new_from_timeval_utc(timeval);
};

GLib.DateTime.prototype.toISO8601 = function() {
    let res = GdPrivate.date_time_to_iso8601(this);
    if (!res)
        throw 'Failed to convert DateTime into iso8601';

    return res;
}

function generateID(type) {
    let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let randomCharacters = [];
    for(let i = 0; i < 43; i++)
        randomCharacters.push(possible.charAt(Math.floor(Math.random() * possible.length)));

    return type + '-' + randomCharacters.join('');
}

function createActions(self, actionEntries) {
    let actions = {};
    actionEntries.forEach(function(entry) {
        let action;

        if (entry.state)
            action = Gio.SimpleAction.new_stateful(entry.name, null, entry.state);
        else
            action = Gio.SimpleAction.new(entry.name, null);

        if (entry.callback)
            action.connect('activate', Lang.bind(self, entry.callback));

        if (entry.hasOwnProperty('enabled'))
            action.enabled = entry.enabled;

        actions[entry.name] = action;
    });

    return actions;
}

function addActions(actionMap, actions) {
    for (let i in actions) {
        actionMap.add_action(actions[i]);
    }
}

function removeActions(actionMap, actions) {
    for (let i in actions) {
        actionMap.remove_action(actions[i].name);
    }
}

Gtk.Widget.prototype.connectSensitiveToAction = function(actionGroup, actionName) {
    this.sensitive = actionGroup.get_action_enabled(actionName);

    actionGroup.connect('action-enabled-changed::' + actionName,
        Lang.bind(this, function(actionGroup, actionName, enabled) {
            this.sensitive = enabled;
        }));
}

Gtk.Button.prototype.connectClickedToAction = function(actionGroup, actionName) {
    this.connect('clicked', Lang.bind(this, function(button) {
        actionGroup.activate_action(actionName, null);
    }));
}

Gtk.Button.prototype.connectToggledToAction = function(actionGroup, actionName) {
    this.connect('toggled', Lang.bind(this, function(button) {
        actionGroup.change_action_state('search', GLib.Variant.new('b', button.active));
    }));

    actionGroup.connect('action-state-changed::' + actionName,
        Lang.bind(this, function(actionGroup, actionName, state) {
            this.active = state.get_boolean();
        }));
}

const BaseManager = new Lang.Class({
    Name: 'BaseManager',

    _init: function() {
        this._items = {};
        this._changedSignals = {};
    },

    getItems: function() {
        return this._items;
    },

    getItemsCount: function() {
        return Object.keys(this._items).length;
    },

    getItemById: function(id) {
        let retval = this._items[id];

        if (!retval)
            retval = null;

        return retval;
    },
    
    addItem: function(item) {
        item._manager = this;

        this._items[item.id] = item;
        this._changedSignals[item.id] =
            item.connect('changed', Lang.bind(this, this._itemChanged));

        this.emit('item-added', item);
    },

    removeItem: function(item) {
        this.removeItemById(item.id);
    },

    removeItemById: function(id) {
        let item = this._items[id];

        if (item) {
            item.disconnect(this._changedSignals[id]);
            delete(this._changedSignals[id]);
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
    },

    _itemChanged: function(item) {
        this.emit('item-changed', item);
    }
});
Signals.addSignalMethods(BaseManager.prototype)