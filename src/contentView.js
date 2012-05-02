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

const Clutter = imports.gi.Clutter;
const Gdk = imports.gi.Gdk;
const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;
const GtkClutter = imports.gi.GtkClutter;

const Lang = imports.lang;
const Mainloop = imports.mainloop;

const Config = imports.config;
const Global = imports.global;
const ListsIconView = imports.listsIconView;
const SpinnerBox = imports.spinnerBox;

const ContentView = Lang.Class({
    Name: 'ContentView',
    Extends: Clutter.Box,

    _init: function() {
        this._layout = new Clutter.BinLayout();
        this.parent({ layout_manager: this._layout });

        /* Add ListsIconView */
        let view = new ListsIconView.ListsIconView();
        let viewActor = new GtkClutter.Actor({ contents: view });
        this._layout.add(viewActor, Clutter.BinAlignment.FILL,
            Clutter.BinAlignment.FILL);

        /* Add NotificationManager */
        let notificationManagerActor =
            new GtkClutter.Actor({ contents: Global.notificationManager });

        /* Add SpinnerBox */
        this._spinnerBox = new SpinnerBox.SpinnerBox();
        this._layout.add(this._spinnerBox, Clutter.BinAlignment.FILL,
            Clutter.BinAlignment.FILL);
        this._spinnerBox.lower_bottom();

        /* XXX: test */
        this._spinnerBox.moveInDelayed(1000);
    }
});
