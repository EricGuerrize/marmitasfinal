// src/services/authService.js
export const authService = {
    async loginAdmin(email, senha) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha
      })
      
      if (error) throw error
      return data.user
    },
  
    async isAdmin(user) {
      const { data } = await supabase
        .from('admins')
        .select('*')
        .eq('email', user.email)
        .eq('ativo', true)
      
      return data.length > 0
    }
  }