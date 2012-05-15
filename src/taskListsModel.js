/*
 * Copyright (c) 2012 Carl-Anton Ingmarsson
 *
 * Gnome Documents is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by the
 * Free Software Foundation; either version 2 of the License, or (at your
 * option) any later version.
 *
 * Gnome Documents is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
 * or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with Gnome Documents; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
 *
 * Author: Carl-Anton Ingmarsson <carlantoni@gnome.org>
 *
 */

const Gd = imports.gi.Gd;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;

const Gettext = imports.gettext;
const _ = imports.gettext.gettext;

const Lang = imports.lang;
const Mainloop = imports.mainloop;

const Global = imports.global;
const Utils = imports.utils;

const COLUMN_NAME      = 0;
const COLUMN_PIXBUF    = 1;
const COLUMN_SOURCE_ID = 2;

const TaskListsModel = Lang.Class({
    Name: 'TaskListsModel',
    Extends: Gtk.ListStore,

    _init: function() {
        this.parent();

        this.set_column_types([GObject.TYPE_STRING, GObject.TYPE_OBJECT, GObject.TYPE_STRING]);
    },

    add: function(name, pixbuf, sourceID)
    {
        let iter = this.append();
        this.set_value(iter, COLUMN_NAME, name);

        this.set_value(iter, COLUMN_PIXBUF, pixbuf);

        this.set_value(iter, COLUMN_SOURCE_ID, sourceID);
    },

    removeByID: function(sourceID)
    {
        let [res, iter] = this.get_iter_first();
        if (!res)
            return;
    
        while (true) {
            if (sourceID == this.get_value(iter, COLUMN_SOURCE_ID) &&
                !this.remove(iter))
                break;

            else if (!this.iter_next(iter))
                break;
        }    
    },
});
