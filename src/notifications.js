/*
 * Copyright (c) 2012 Red Hat, Inc.
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
 * Author: Cosimo Cecchi <cosimoc@redhat.com>
 *
 */

const Gd = imports.gi.Gd;
const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;
const _ = imports.gettext.gettext;

const Global = imports.global;
const Utils = imports.utils;

const Lang = imports.lang;

const NotificationManager = Lang.Class({
    Name: 'NotificationManager',
    Extends: Gd.Notification,

    _init: function() {
        this.parent({ timeout: -1, show_close_button: true,
            halign: Gtk.Align.CENTER, valign: Gtk.Align.START });

        this._grid = new Gtk.Grid({ orientation: Gtk.Orientation.VERTICAL,
            row_spacing: 6 });
        this.add(this._grid);

        this.hide();
    },

    addNotification: function(notification) {
        this._grid.add(notification);

        notification.connect('destroy',
            Lang.bind(this, this._onWidgetDestroy));

        this.show_all();
    },

    _onWidgetDestroy: function() {
        let children = this._grid.get_children();

        if (children.length == 0)
            this.hide();
    }
});

