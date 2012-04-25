/*
 * Copyright (c) 2011 Red Hat, Inc.
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
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;
const GtkClutter = imports.gi.GtkClutter;
const Pango = imports.gi.Pango;

const Gettext = imports.gettext;
const _ = imports.gettext.gettext;

const Lang = imports.lang;
const Mainloop = imports.mainloop;

const Global = imports.global;
const Tweener = imports.util.tweener;
const Utils = imports.utils;
const WindowMode = imports.windowMode;


const MainToolbar = new Lang.Class({
    Name: 'MainToolbar',
    Extends: Gtk.Toolbar,

    _init: function(params) {
        this.parent({ icon_size: Gtk.IconSize.MENU });
        this.get_style_context().add_class(Gtk.STYLE_CLASS_MENUBAR);

        let item = new Gtk.ToolItem({ expand: true });
        item.set_expand(true);
        this.add(item);

        let builder = Utils.loadBuilder('main_toolbar.glade', ['main_grid']);
        let main_grid = builder.get_object('main_grid');
        main_grid.reparent(item);

        let option_button = builder.get_object('option_button');
        option_button.setSymbolic('emblem-default-symbolic');
        
        this.show_all();
    },

    _getVerticalSizeGroup: function() {
        let dummy = new Gtk.ToggleButton();
        dummy.add(Gtk.Image.new_from_stock(Gtk.STOCK_OPEN, Gtk.IconSize.MENU));
        dummy.show_all();

        let size = new Gtk.SizeGroup(Gtk.SizeGroup.VERTICAL);
        size.add_widget(dummy);
        return size;
    },
});

