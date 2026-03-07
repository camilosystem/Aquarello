-- LaundryGO - Políticas de Row Level Security

-- Función helper para verificar rol de usuario
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$;

-- PROFILES: Políticas
CREATE POLICY "profiles_select_own" ON public.profiles 
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles 
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles 
  FOR UPDATE USING (auth.uid() = id);

-- Staff puede ver todos los perfiles
CREATE POLICY "profiles_select_staff" ON public.profiles 
  FOR SELECT USING (
    public.get_user_role(auth.uid()) IN ('admin', 'operador', 'domiciliario', 'conductor')
  );

-- ORDERS: Políticas
CREATE POLICY "orders_select_customer" ON public.orders 
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "orders_insert_customer" ON public.orders 
  FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "orders_update_customer" ON public.orders 
  FOR UPDATE USING (customer_id = auth.uid());

-- Staff puede ver y modificar todos los pedidos
CREATE POLICY "orders_select_staff" ON public.orders 
  FOR SELECT USING (
    public.get_user_role(auth.uid()) IN ('admin', 'operador', 'domiciliario', 'conductor')
  );

CREATE POLICY "orders_update_staff" ON public.orders 
  FOR UPDATE USING (
    public.get_user_role(auth.uid()) IN ('admin', 'operador', 'domiciliario', 'conductor')
  );

-- ORDER_PREFERENCES: Políticas
CREATE POLICY "order_prefs_select_customer" ON public.order_preferences 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_id AND orders.customer_id = auth.uid())
  );

CREATE POLICY "order_prefs_insert_customer" ON public.order_preferences 
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_id AND orders.customer_id = auth.uid())
  );

CREATE POLICY "order_prefs_select_staff" ON public.order_preferences 
  FOR SELECT USING (
    public.get_user_role(auth.uid()) IN ('admin', 'operador', 'domiciliario', 'conductor')
  );

-- ORDER_HISTORY: Políticas
CREATE POLICY "order_history_select_customer" ON public.order_history 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_id AND orders.customer_id = auth.uid())
  );

CREATE POLICY "order_history_select_staff" ON public.order_history 
  FOR SELECT USING (
    public.get_user_role(auth.uid()) IN ('admin', 'operador', 'domiciliario', 'conductor')
  );

CREATE POLICY "order_history_insert_staff" ON public.order_history 
  FOR INSERT WITH CHECK (
    public.get_user_role(auth.uid()) IN ('admin', 'operador', 'domiciliario', 'conductor')
  );

-- WASHING_PROCESS: Políticas (solo operadores y admin)
CREATE POLICY "washing_select_staff" ON public.washing_process 
  FOR SELECT USING (
    public.get_user_role(auth.uid()) IN ('admin', 'operador')
  );

CREATE POLICY "washing_insert_staff" ON public.washing_process 
  FOR INSERT WITH CHECK (
    public.get_user_role(auth.uid()) IN ('admin', 'operador')
  );

CREATE POLICY "washing_update_staff" ON public.washing_process 
  FOR UPDATE USING (
    public.get_user_role(auth.uid()) IN ('admin', 'operador')
  );

-- INVENTORY: Políticas (solo operadores y admin)
CREATE POLICY "inventory_select_staff" ON public.inventory 
  FOR SELECT USING (
    public.get_user_role(auth.uid()) IN ('admin', 'operador')
  );

CREATE POLICY "inventory_all_admin" ON public.inventory 
  FOR ALL USING (
    public.get_user_role(auth.uid()) = 'admin'
  );

-- INVENTORY_USAGE: Políticas
CREATE POLICY "inventory_usage_select_staff" ON public.inventory_usage 
  FOR SELECT USING (
    public.get_user_role(auth.uid()) IN ('admin', 'operador')
  );

CREATE POLICY "inventory_usage_insert_staff" ON public.inventory_usage 
  FOR INSERT WITH CHECK (
    public.get_user_role(auth.uid()) IN ('admin', 'operador')
  );

-- PAYMENTS: Políticas
CREATE POLICY "payments_select_customer" ON public.payments 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_id AND orders.customer_id = auth.uid())
  );

CREATE POLICY "payments_insert_customer" ON public.payments 
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_id AND orders.customer_id = auth.uid())
  );

CREATE POLICY "payments_update_customer" ON public.payments 
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_id AND orders.customer_id = auth.uid())
  );

CREATE POLICY "payments_select_staff" ON public.payments 
  FOR SELECT USING (
    public.get_user_role(auth.uid()) IN ('admin', 'operador')
  );

-- RECEIPTS: Políticas
CREATE POLICY "receipts_select_customer" ON public.receipts 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_id AND orders.customer_id = auth.uid())
  );

CREATE POLICY "receipts_select_staff" ON public.receipts 
  FOR SELECT USING (
    public.get_user_role(auth.uid()) IN ('admin', 'operador')
  );

CREATE POLICY "receipts_insert_staff" ON public.receipts 
  FOR INSERT WITH CHECK (
    public.get_user_role(auth.uid()) IN ('admin', 'operador')
  );

-- PRICING: Políticas (todos pueden ver, solo admin modifica)
CREATE POLICY "pricing_select_all" ON public.pricing 
  FOR SELECT USING (TRUE);

CREATE POLICY "pricing_all_admin" ON public.pricing 
  FOR ALL USING (
    public.get_user_role(auth.uid()) = 'admin'
  );
