
-- Auth trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger'ları
DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_machines ON public.machines;
CREATE TRIGGER set_updated_at_machines BEFORE UPDATE ON public.machines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_technicians ON public.technicians;
CREATE TRIGGER set_updated_at_technicians BEFORE UPDATE ON public.technicians
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_work_orders ON public.work_orders;
CREATE TRIGGER set_updated_at_work_orders BEFORE UPDATE ON public.work_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_work_order_parts ON public.work_order_parts;
CREATE TRIGGER set_updated_at_work_order_parts BEFORE UPDATE ON public.work_order_parts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_master_profiles ON public.master_profiles;
CREATE TRIGGER set_updated_at_master_profiles BEFORE UPDATE ON public.master_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_correction_rules ON public.correction_rules;
CREATE TRIGGER set_updated_at_correction_rules BEFORE UPDATE ON public.correction_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_corrections ON public.corrections;
CREATE TRIGGER set_updated_at_corrections BEFORE UPDATE ON public.corrections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_learning_cases ON public.learning_cases;
CREATE TRIGGER set_updated_at_learning_cases BEFORE UPDATE ON public.learning_cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_diagnosis_sessions ON public.diagnosis_sessions;
CREATE TRIGGER set_updated_at_diagnosis_sessions BEFORE UPDATE ON public.diagnosis_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_machine_service_history ON public.machine_service_history;
CREATE TRIGGER set_updated_at_machine_service_history BEFORE UPDATE ON public.machine_service_history
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_machine_logs ON public.machine_logs;
CREATE TRIGGER set_updated_at_machine_logs BEFORE UPDATE ON public.machine_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_repair_videos ON public.repair_videos;
CREATE TRIGGER set_updated_at_repair_videos BEFORE UPDATE ON public.repair_videos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
