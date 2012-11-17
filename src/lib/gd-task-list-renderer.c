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

#include "gd-utils.h"

#include "gd-task-list-renderer.h"

#define PIXBUF_WIDTH 140
#define PIXBUF_HEIGHT 180

G_DEFINE_TYPE (GdTaskListRenderer, gd_task_list_renderer, GTK_TYPE_CELL_RENDERER);

enum {
  PROP_ITEMS = 1,
  NUM_PROPERTIES
};

static GParamSpec *properties[NUM_PROPERTIES] = { NULL, };

struct _GdTaskListRendererPrivate {
    GPtrArray *items;
};

static void
gd_task_list_renderer_render (GtkCellRenderer      *cell,
                              cairo_t              *cr,
                              GtkWidget            *widget,
                              const GdkRectangle   *background_area,
                              const GdkRectangle   *cell_area,
                              GtkCellRendererState  flags)
{
    GdTaskListRenderer *self = GD_TASK_LIST_RENDERER (cell);

    GtkCssProvider *provider;
    GError *err = NULL;
    GtkStyleContext *context;
    GtkWidgetPath *path;
    
    GtkBorder border, padding;

    provider = gd_load_css_provider_from_resource ("/org/gnome/todo/gnome-todo.css", &err);
    if (!provider)
    {
        g_error("Failed to load style resource (%s)", err->message);
        goto done;
    }

    context = gtk_style_context_new ();

    gtk_style_context_add_provider (context, GTK_STYLE_PROVIDER (provider),
                                    GTK_STYLE_PROVIDER_PRIORITY_APPLICATION);
    g_object_unref (provider);

    path = gtk_widget_path_new ();
    gtk_widget_path_append_for_widget (path, widget); 
    gtk_style_context_set_path (context, path);
    gtk_widget_path_unref (path);

    gtk_style_context_save (context);
    gtk_style_context_add_class (context, "todo-task-list-renderer");

    gtk_style_context_get_border (context, GTK_STATE_FLAG_NORMAL, &border);
    gtk_style_context_get_padding (context, GTK_STATE_FLAG_NORMAL, &padding);

    gtk_render_background (context, cr, cell_area->x, cell_area->y,
                           cell_area->width, cell_area->height);

#if 0
    if (self->priv->items)
    {
        int text_x, text_y;
        PangoLayout *layout;
        
        text_x = border.left + padding.left;
        text_y = border.top + padding.top;

        layout = pango_layout_new (gtk_widget_get_pango_context(GTK_WIDGET (view)));
        pango_layout_set_text (layout, text, -1);
        pango_layout_set_width (layout, PIXBUF_WIDTH);
        pango_layout_set_height (layout, PIXBUF_HEIGHT);

        gtk_render_layout (context, cr, text_x, text_y, layout);
    }
#endif
    gtk_style_context_restore (context);

    g_object_unref (context);

done:
    g_clear_error (&err);
}

static void
gd_task_list_renderer_get_preferred_size (GtkCellRenderer *cell,
                                          GtkWidget       *widget,
                                          GtkRequisition  *minimum_size,
                                          GtkRequisition  *natural_size)
{
    GtkStyleContext *context;
    GtkBorder border, padding;
    int width, height;

    context = gtk_widget_get_style_context (widget);
    gtk_style_context_save (context);
    gtk_style_context_add_class (context, "TaskListsPixbuf");

    gtk_style_context_get_border (context, GTK_STATE_FLAG_NORMAL, &border);
    gtk_style_context_get_padding (context, GTK_STATE_FLAG_NORMAL, &padding);

    width = PIXBUF_WIDTH + padding.left + padding.right + border.left + border.right;
    height = PIXBUF_HEIGHT + padding.top + padding.bottom + border.top + border.bottom;

    minimum_size->width = natural_size->width = width;
    minimum_size->height = natural_size->height = height;

    gtk_style_context_restore(context);
}

static void
gd_task_list_renderer_get_preferred_width (GtkCellRenderer *cell,
                                           GtkWidget       *widget,
                                           gint            *minimum_size,
                                           gint            *natural_size)
{
    GtkRequisition min_req, nat_req;

    gd_task_list_renderer_get_preferred_size (cell, widget, &min_req, &nat_req);

    if (minimum_size)
        *minimum_size = min_req.width;
    if (natural_size)
        *natural_size = nat_req.width;
}

static void
gd_task_list_renderer_get_preferred_height (GtkCellRenderer *cell,
                                            GtkWidget       *widget,
                                            gint            *minimum_size,
                                            gint            *natural_size)
{
    GtkRequisition min_req, nat_req;

    gd_task_list_renderer_get_preferred_size(cell, widget, &min_req, &nat_req);

    if (minimum_size)
        *minimum_size = min_req.height;
    if (natural_size)
        *natural_size = nat_req.height;
}

static void
gd_task_list_renderer_get_property (GObject    *object,
                                    guint       property_id,
                                    GValue     *value,
                                    GParamSpec *pspec)
{
  GdTaskListRenderer *self = GD_TASK_LIST_RENDERER (object);

  switch (property_id)
    {
    case PROP_ITEMS:
      g_value_set_boxed (value, self->priv->items);
      break;
    default:
      G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
      break;
    }
}

static void
gd_task_list_renderer_set_property (GObject    *object,
                                    guint       property_id,
                                    const GValue *value,
                                    GParamSpec *pspec)
{
  GdTaskListRenderer *self = GD_TASK_LIST_RENDERER (object);

  switch (property_id)
    {
    case PROP_ITEMS:
      if (self->priv->items)
        g_ptr_array_unref (self->priv->items);
      self->priv->items = g_value_get_boxed (value);
      break;
    default:
      G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
      break;
    }
}

static void
gd_task_list_renderer_class_init (GdTaskListRendererClass *klass)
{
  GObjectClass *oclass = G_OBJECT_CLASS (klass);
  GtkCellRendererClass *crclass = GTK_CELL_RENDERER_CLASS (klass);

  crclass->render = gd_task_list_renderer_render;
  crclass->get_preferred_width = gd_task_list_renderer_get_preferred_width;
  crclass->get_preferred_height = gd_task_list_renderer_get_preferred_height; 
  oclass->get_property = gd_task_list_renderer_get_property;
  oclass->set_property = gd_task_list_renderer_set_property;

    properties[PROP_ITEMS] =
        g_param_spec_boxed ("items",
                            "Items",
                            "The list items",
                            G_TYPE_PTR_ARRAY,
                            G_PARAM_READWRITE |
                            G_PARAM_STATIC_STRINGS);

  g_type_class_add_private (klass, sizeof (GdTaskListRendererPrivate));
  g_object_class_install_properties (oclass, NUM_PROPERTIES, properties);
}

static void
gd_task_list_renderer_init (GdTaskListRenderer *self)
{
  
  self->priv = G_TYPE_INSTANCE_GET_PRIVATE (self, GD_TYPE_TASK_LIST_RENDERER,
                                            GdTaskListRendererPrivate);
}

GtkCellRenderer *
gd_task_list_renderer_new (void)
{
  return g_object_new (GD_TYPE_TASK_LIST_RENDERER, NULL);
}
