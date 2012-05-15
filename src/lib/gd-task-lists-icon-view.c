/*
 * gnome-todo
 * Copyright (C) Carl-Anton Ingmarsson 2012 <carlantoni@gmail.com>
   * 
 * gnome-todo is free software: you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
   * 
 * gnome-todo is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Lesser General Public License for more details.
 * 
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.";
 */

#include <gdk/gdk.h>

#include "gd-toggle-pixbuf-renderer.h"

#include "gd-task-lists-icon-view.h"

#define VIEW_ITEM_WRAP_WIDTH 128
#define VIEW_COLUMN_SPACING 20
#define VIEW_MARGIN 16

#define PIXBUF_WIDTH 140
#define PIXBUF_HEIGHT 180

struct _GdTaskListsIconViewPrivate
{
  GtkCellRenderer *pixbuf_cell;
  GtkCellRenderer *text_cell;
};

G_DEFINE_TYPE (GdTaskListsIconView, gd_task_lists_icon_view, GTK_TYPE_ICON_VIEW);

/**
 * gd_task_lists_icon_view_draw_pixbuf:
 * 
 * Return value: (transfer full):
 */
GdkPixbuf *
gd_task_lists_icon_view_draw_pixbuf (GdTaskListsIconView *view, const char *text)
{
  GtkStyleContext *context;
  GtkBorder border, padding;

  int width, height;
  cairo_surface_t *surface;
  cairo_t *cr;

  int text_x, text_y;
  PangoLayout *layout;
  
  context = gtk_widget_get_style_context (GTK_WIDGET (view));
  gtk_style_context_save (context);
  gtk_style_context_add_class (context, "TaskListsPixbuf");

  gtk_style_context_get_border (context, GTK_STATE_FLAG_NORMAL, &border);
  gtk_style_context_get_padding (context, GTK_STATE_FLAG_NORMAL, &padding);

  width = PIXBUF_WIDTH + padding.left + padding.right + border.left + border.right;
  height = PIXBUF_HEIGHT + padding.top + padding.bottom + border.top + border.bottom;

  surface = cairo_image_surface_create (CAIRO_FORMAT_ARGB32, width, height);
  cr = cairo_create (surface);

  gtk_render_background (context, cr, 0, 0, width, height);

  text_x = border.left + padding.left;
  text_y = border.top + padding.top;
  
  layout = pango_layout_new (gtk_widget_get_pango_context(GTK_WIDGET (view)));
  pango_layout_set_text (layout, text, -1);
  pango_layout_set_width (layout, PIXBUF_WIDTH);
  pango_layout_set_height (layout, PIXBUF_HEIGHT);

  gtk_render_layout (context, cr, text_x, text_y, layout);

  gtk_style_context_restore (context);

  return gdk_pixbuf_get_from_surface (surface, 0, 0, width, height);
}

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

  view->priv->pixbuf_cell = cell = gd_toggle_pixbuf_renderer_new ();
  g_object_set (cell,
                "xalign", 0.5,
                "yalign", 0.5,
                NULL);

  gtk_cell_layout_pack_start (GTK_CELL_LAYOUT (view), cell, FALSE);
  gtk_cell_layout_add_attribute (GTK_CELL_LAYOUT (view), cell,
                                 "pixbuf", 1);

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

