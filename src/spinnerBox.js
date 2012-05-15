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

const Gtk = imports.gi.Gtk;
const GtkClutter = imports.gi.GtkClutter;
const _ = imports.gettext.gettext;

const Tweener = imports.util.tweener;

const Lang = imports.lang;
const Mainloop = imports.mainloop;

const Utils = imports.utils;

const SpinnerBox = Lang.Class({
    Name: 'SpinnerBox',
    Extends: GtkClutter.Actor,

    _init: function() {
        this.parent({ opacity: 255 });

        this._delayedMoveId = 0;

        let builder = new Gtk.Builder();
        builder.add_from_resource('/org/gnome/todo/ui/spinner_box.glade');

        this._grid = builder.get_object('grid');
        this.contents = this._grid;

        this._grid.connect('destroy', Lang.bind(this, this._clearDelayId));
        this._grid.show_all();
    },

    _clearDelayId: function() {
        if (this._delayedMoveId != 0) {
            Mainloop.source_remove(this._delayedMoveId);
            this._delayedMoveId = 0;
        }
    },

    moveIn: function() {
        this._clearDelayId();
        this.raise_top();

        Tweener.addTween(this, { opacity: 255,
                                 time: 0.30,
                                 transition: 'easeOutQuad' });
    },

    moveOut: function() {
        this._clearDelayId();

        Tweener.addTween(this, { opacity: 0,
                                 time: 0.30,
                                 transition: 'easeOutQuad',
                                 onComplete: function () {
                                    this.lower_bottom();
                                 },
                                 onCompleteScope: this });
    },

    moveInDelayed: function(delay) {
        this._clearDelayId();

        this._delayedMoveId = Mainloop.timeout_add(delay, Lang.bind(this,
            function() {
                this._delayedMoveId = 0;

                this.moveIn();
                return false;
            }));
    }
});

