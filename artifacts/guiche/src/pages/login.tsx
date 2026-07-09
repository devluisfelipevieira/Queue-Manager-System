import React from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useLogin, useGetMe } from '@workspace/api-client-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

const loginSchema = z.object({
  username: z.string().min(1, "Usuário é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const loginMutation = useLogin();
  const { data: user } = useGetMe({ query: { retry: false, enabled: !!localStorage.getItem("guiche_token") } });

  React.useEffect(() => {
    if (user) {
      if (user.role === 'recepcao') setLocation('/recepcao');
      else setLocation(`/mesa/${user.deskId}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  function onSubmit(values: z.infer<typeof loginSchema>) {
    loginMutation.mutate({ data: values }, {
      onSuccess: (res) => {
        localStorage.setItem("guiche_token", res.token);
        if (res.role === 'recepcao') setLocation('/recepcao');
        else setLocation(`/mesa/${res.deskId}`);
      }
    });
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="bg-[#00315a] py-10 px-8 text-center border-b-[6px] border-blue-400">
           <div className="bg-white/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner border border-white/5">
             <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
             </svg>
           </div>
           <h1 className="text-3xl font-extrabold text-white tracking-tight leading-none mb-1">
             Gerenciador
             <br />
             <span className="text-blue-200">de Guichê</span>
           </h1>
           <p className="text-blue-100 mt-4 text-xs uppercase tracking-[0.2em] font-bold">Acesso Restrito do Servidor</p>
        </div>
        <div className="p-8">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2.5">
              <Label htmlFor="username">Matrícula ou Usuário</Label>
              <Input id="username" {...form.register("username")} placeholder="Ex: mesa1" />
              {form.formState.errors.username && <p className="text-sm text-red-600 font-bold">{form.formState.errors.username.message}</p>}
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="password">Senha de Acesso</Label>
              <Input id="password" type="password" {...form.register("password")} placeholder="••••••••" />
              {form.formState.errors.password && <p className="text-sm text-red-600 font-bold">{form.formState.errors.password.message}</p>}
            </div>
            
            {loginMutation.error && (
               <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm font-bold border border-red-200 shadow-sm flex items-center gap-3">
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  Credenciais inválidas. Verifique os dados.
               </div>
            )}

            <Button type="submit" className="w-full mt-2" size="lg" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? "AUTENTICANDO..." : "ENTRAR NO SISTEMA"}
            </Button>
          </form>
        </div>
        <div className="bg-gray-50 py-4 text-center border-t border-gray-100">
           <p className="text-xs text-gray-500 font-medium">Uso exclusivo da Prefeitura Municipal</p>
        </div>
      </div>
    </div>
  );
}
