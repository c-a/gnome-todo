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

#include <gdk/gdk.h>

#include "gd-task-list-renderer.h"

#include "gd-task-lists-icon-view.h"

#define VIEW_ITEM_WRAP_WIDTH 128
#define VIEW_COLUMN_SPACING 20
#define VIEW_MARGIN 16

struct _GdTaskListsIconViewPrivate
{
  GtkCellRenderer *tasks_cell;
  GtkCellRenderer *text_cell;
};

G_DEFINE_TYPE (GdTaskListsIconView, gd_task_lists_icon_view, GTK_TYPE_ICON_VIEW);

static void
gd_task_lists_icon_view_constructed (GObject *object)
{
  GdTaskListsIconView *view = GD_TASK_LISTS_ICON_VIEW (object);

  GtkCellRenderer *cell;

  G_OBJECT_CLASS (gd_task_lists_icon_view_parent_class)->constructed (object);

  gtk_widget_set_hexpand (GTK_WIDGET (view), TRUE);
  gtk_widget_set_vexpand (GTK_WIDGET (view), TRUE);
  gtk_icon_view_set_selection_mode (GTK_ICON_VIEW (view), GTK_SELECTION_NONE);

  g_object_set (view,
                "column-spacing", VIEW_COLUMN_SPACING,
                "margin", VIEW_MARGIN,
                NULL);

  view->priv->tasks_cell = cell = gd_task_list_renderer_new ();
  g_object_set (cell,
                "xalign", 0.5,
                "yalign", 0.5,
                NULL);

  gtk_cell_layout_pack_start (GTK_CELL_LAYOUT (view), cell, FALSE);

  view->priv->text_cell = cell = gtk_cell_renderer_text_new ();
  g_object_set (cell,
                "alignment", PANGO_ALIGN_CENTER,
                "wrap-mode", PANGO_WRAP_WORD_CHAR,
                "wrap-width", VIEW_ITEM_WRAP_WIDTH,
                "weight", PANGO_WEIGHT_BOLD,
                NULL);
  gtk_cell_layout_pack_start (GTK_CELL_LAYOUT (view), cell, FALSE);
  gtk_cell_layout_add_attribute (GTK_CELL_LAYOUT (view), cell,
                                 "text", 0);
}

static void
gd_task_lists_icon_view_finalize (GObject *object)
{
  G_OBJECT_CLASS (gd_task_lists_icon_view_parent_class)->finalize (object);
}

static void
gd_task_lists_icon_view_init (GdTaskListsIconView *view)
{
  view->priv =
	G_TYPE_INSTANCE_GET_PRIVATE (view, GD_TYPE_TASK_LISTS_ICON_VIEW, GdTaskListsIconViewPrivate);
}

static void
gd_task_lists_icon_view_class_init (GdTaskListsIconViewClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);
  GtkWidgetClass *wclass = GTK_WIDGET_CLASS (klass);

  object_class->constructed = gd_task_lists_icon_view_constructed;
  object_class->finalize = gd_task_lists_icon_view_finalize;

  gtk_widget_class_install_style_property (wclass,
                                           g_param_spec_int ("check-icon-size",
                                                             "Check icon size",
                                                             "Check icon size",
                                                             -1, G_MAXINT, 40,
                                                             G_PARAM_READWRITE));

  g_type_class_add_private (klass, sizeof (GdTaskListsIconViewPrivate));
}

