/*
 * Copyright (c) 2012 Carl-Anton Ingmarsson
 *
 * Gnome Todo is free software; you can redistribute it and/or modify
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
 */

const Lang = imports.lang;

const Gd = imports.gi.Gd;
const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;

const Config = imports.config;
const Global = imports.global;

const MainView = Lang.Class({
    Name: 'MainView',
    Extends: Gtk.ScrolledWindow,

    _init: function() {
        this.parent();

         /* Add taskListsView */
        this._taskListsView = new Gd.TaskListsIconView();

        this.currentView = this._taskListsView;
        
        this.currentView.get_style_context().add_class('todo-content-view');
        this.add(this.currentView);
    },

    setModel: function(model) {
        this.currentView.set_model(model);
    }
});