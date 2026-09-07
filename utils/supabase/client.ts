import { useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

// Dentro do seu hook ou componente que carrega as transações:
useEffect(() => {
  // Cria um canal de escuta em tempo real para a tabela de transações
  const channel = supabase
    .channel('custom-all-channel')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'transactions' }, // Substitua 'transactions' pelo nome real da sua tabela
      (payload) => {
        console.log('Mudança detectada de outro usuário:', payload);
        // Aqui você chama novamente a função que busca os dados para atualizar a tela
        fetchFinanceData(); 
      }
    )
    .subscribe();

  // Limpa o canal ao sair do componente
  return () => {
    supabase.removeChannel(channel);
  };
}, []);
