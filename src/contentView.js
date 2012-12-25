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
const Gd = imports.gi.Gd;
const Gdk = imports.gi.Gdk;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;
const GtkClutter = imports.gi.GtkClutter;

const _ = imports.gettext.gettext;
const Lang = imports.lang;
const Mainloop = imports.mainloop;

const Config = imports.config;
const Global = imports.global;
const SpinnerBox = imports.spinnerBox;

const EmptyResultsBox = new Lang.Class({
    Name: 'EmptyResultsBox',
    Extends: Gtk.Grid,

    _init: function(noAccounts) {
        this.parent({ orientation: Gtk.Orientation.HORIZONTAL,
                                     column_spacing: 12,
                                     hexpand: true,
                                     vexpand: true,
                                     halign: Gtk.Align.CENTER,
                                     valign: Gtk.Align.CENTER });

        this.get_style_context().add_class('dim-label');

        this._image = new Gtk.Image({ pixel_size: 64,
                                      icon_name: 'emblem-documents-symbolic' });
        this.add(this._image);

        this._labelsGrid = new Gtk.Grid({ orientation: Gtk.Orientation.VERTICAL,
                                          row_spacing: 12 });
        this.add(this._labelsGrid);

        let titleLabel = new Gtk.Label({ label: '<b><span size="large">' +
                                         _("No Task Lists Found") +
                                         '</span></b>',
                                         use_markup: true,
                                         halign: Gtk.Align.START,
                                         vexpand: true });
        this._labelsGrid.add(titleLabel);

        if (!noAccounts) {
            titleLabel.valign = Gtk.Align.CENTER;
        } else {
            titleLabel.valign = Gtk.Align.START;
            this._addSystemSettingsLabel();
        }

        this.show_all();
    },

    _addSystemSettingsLabel: function() {
        let detailsStr =
            // Translators: %s here is "System Settings", which is in a separate string
            // due to markup, and should be translated only in the context of this sentence
            _("You can add your online accounts in %s").format(
            " <a href=\"system-settings\">" +
            // Translators: this should be translated in the context of the
            // "You can add your online accounts in System Settings" sentence above
            _("System Settings") +
            "</a>");
        let details = new Gtk.Label({ label: detailsStr,
                                      use_markup: true,
                                      halign: Gtk.Align.START,
                                      xalign: 0,
                                      max_width_chars: 24,
                                      wrap: true });
        this._labelsGrid.add(details);

        details.connect('activate-link', Lang.bind(this,
            function(label, uri) {
                if (uri != 'system-settings')
                    return false;

                try {
                    let app = Gio.AppInfo.create_from_commandline(
                        'gnome-control-center online-accounts', null, 0);

                    let screen = this.get_screen();
                    let display = screen ? screen.get_display() : Gdk.Display.get_default();
                    let ctx = display.get_app_launch_context();

                    if (screen)
                        ctx.set_screen(screen);

                    app.launch([], ctx);
                } catch(e) {
                    log('Unable to launch gnome-control-center: ' + e.message);
                }

                return true;
            }));
    }
});

const ContentView = Lang.Class({
    Name: 'ContentView',
    Extends: Clutter.Box,

    _init: function() {
        this._layout = new Clutter.BinLayout();
        this.parent({ layout_manager: this._layout });

        /* Add NotificationManager at the top.*/
        this.add_child(Global.notificationManager);

        /* Then add the MainView. */
        this.mainView = new Gd.MainView({'view-type': Gd.MainViewType.ICON });

        this.mainView.show_all();
        let viewActor = new GtkClutter.Actor({ contents: this.mainView,
            x_expand: true, y_expand: true });
        this.insert_child_below(viewActor, Global.notificationManager);

        /* Add SpinnerBox */
        this._spinnerBox = new SpinnerBox.SpinnerBox();
        this.insert_child_below(this._spinnerBox, viewActor);
    },

    _removeNoResults: function() {
        if (this._noResults)
        {
            this._noResultsActor.destroy();
            delete this._noResultsActor;
            delete this._noResults;
        }
    },

    showMainView: function(loading) {
        if (this._noResults)
            this._removeNoResults();

        if (loading)
            this._spinnerBox.moveInDelayed();
        else
            this._spinnerBox.moveOut();
    },
    
    showNoResults: function(noAccounts) {
        if (this._noResultsActor)
            this._noResultsActor.destroy();

        this._spinnerBox.moveOut();

        this._noResults = new EmptyResultsBox(noAccounts);
        this._noResultsActor = new GtkClutter.Actor({ contents: this._noResults,
            x_expand: true, y_expand: true });
        this.insert_child_below(this._noResultsActor, Global.notificationManager);
    }
});
