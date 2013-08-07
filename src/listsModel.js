/*
 * Copyright (c) 2013 Carl-Anton Ingmarsson <carlantoni@gnome.org>
 *
 * Gnome To Do is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by the
 * Free Software Foundation; either version 2 of the License, or (at your
 * option) any later version.
 *
 * Gnome To Do is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
 * or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with Gnome To Do; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
 *
 * Author: Carl-Anton Ingmarsson <carlantoni@gnome.org>
 *
 */

const Gdk = imports.gi.Gdk;
const GdkPixbuf = imports.gi.GdkPixbuf;
const Gd = imports.gi.Gd;
const GdPrivate = imports.gi.GdPrivate;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;

const Cairo = imports.cairo;
const Gettext = imports.gettext;
const _ = imports.gettext.gettext;

const Lang = imports.lang;

const Global = imports.global;
const Utils = imports.utils;


const ListsModel = new Lang.Class({
    Name: 'ListsModel',
    Extends: Gtk.ListStore,

    _init: function()
    {
        this.parent();

        this.set_column_types([GObject.TYPE_STRING, GObject.TYPE_STRING,
                               GObject.TYPE_STRING, GObject.TYPE_STRING,
                               GdkPixbuf.Pixbuf, GObject.TYPE_INT64,
                               GObject.TYPE_BOOLEAN, GObject.TYPE_UINT]);

        this._sourceSignals = {};
        this._lists = {};
        this._filteredLists = {};
        this._filterRegex = null;
    },

    addSource: function(source)
    {
        source.forEachItem(Lang.bind(this, function(list) {
            this._listAdded(source, list);
        }));

        let signals = [];
        signals.push(source.connect('item-added', Lang.bind(this, this._listAdded)));
        signals.push(source.connect('item-changed', Lang.bind(this, this._listChanged)));
        signals.push(source.connect('item-removed', Lang.bind(this, this._listRemoved)));
        signals.push(source.connect('clear', Lang.bind(this, this._sourceCleared)));

        this._sourceSignals[source.id] = signals;
    },

    removeSource: function(source)
    {
        // Disconnect our signal handlers
        let signals = this._sourceSignals[source.id];
        for (let i = 0; i < signals.length; i++)
            source.disconnect(signals[i]);

        delete this._sourceSignals[source.id];

        this._removeListsBySource(source);
    },

    getListFromPath: function(path)
    {
        let [res, iter] = this.get_iter(path);
        let listID = this.get_value(iter, Gd.MainColumns.ID);

        return this._lists[listID];
    },

    getListCount: function() {
        return Object.keys(this._lists).length;
    },

    setFilterRegex: function(filterRegex) {
        this._filterRegex = filterRegex;

        for (let i in this._filteredLists) {
            let list = this._filteredLists[i];

            if (this._listVisible(list)) {
                delete this._filteredLists[i];
                this._addList(list);
            }
        }

        for (let i in this._lists) {
            let list = this._lists[i];

            if (!this._listVisible(list)) {
                this._removeList(list);
                this._filteredLists[list.id] = list;
            }
        }
    },

    _listVisible: function(list) {
        if (!this._filterRegex)
            return true;

        return this._filterRegex.exec(list.title);
    },

    _addList: function(list) {
        this._lists[list.id] = list;

        let iter = this.append();
        this._updateModel(list, iter);
    },

    _updateList: function(list) {
        this._lists[list.id] = list;

        let iter = this._getIterFromID(list.id);
        this._updateModel(list, iter);
    },

    _removeList: function(list) {
        delete this._lists[list.id];

        let iter = this._getIterFromID(list.id);
        this.remove(iter);
    },
    
    _listAdded: function(source, list)
    {
        if (this._listVisible(list))
            this._addList(list);
        else
            this._filteredLists[list.id] = list;
    },

    _listChanged: function(source, list)
    {
        // Check the filter again
        if (this._listVisible(list)) {
            if (this._filteredLists[list.id]) {
                delete this._filteredLists[list.id];
                this._addList(list);
            }
            else
                this._updateList(list);
        }
        else {
            this._filteredLists[list.id] = list;

            if (this._lists[list.id]) {
                this._removeList(list);
            }
        }
    },

    _listRemoved: function(source, list)
    {
        if (this._lists[list.id])
            this._removeList(list);
        else
            delete this._filteredLists[list.id];
    },

    _sourceCleared: function(source) {
        this._removeListsBySource(source);
    },

    _updateModel: function(list, iter)
    {
        this.set_value(iter, Gd.MainColumns.ID, list.id);
        this.set_value(iter, Gd.MainColumns.PRIMARY_TEXT, list.title);

        let titles = [];
        list.forEachItem(function(item) {
            titles.push(item.title);
        });

        let pixbuf = GdPrivate.draw_task_list(titles);
        this.set_value(iter, Gd.MainColumns.ICON, pixbuf);
    },

    _getIterFromID: function(listID)
    {
        for(let [res, iter] = this.get_iter_first(); res; res = this.iter_next(iter)) {
            let id = this.get_value(iter, Gd.MainColumns.ID);

            if  (id == listID)
                return iter;
        }

        return null;
    },

    _removeListsBySource: function(source) {
        // Remove all TaskLists belonging to this source.
        let [res, iter] = this.get_iter_first();
        while(res) {
            let id = this.get_value(iter, Gd.MainColumns.ID);

            if (source.getItemById(id))
                res = this.remove(iter);
            else
                res = this.iter_next(iter);
        }
    }
});
