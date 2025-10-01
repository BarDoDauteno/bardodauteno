import React from 'react'


const Footer: React.FC = () => {
    return (
        <footer>
            <div className="inner">
                <p>© {new Date().getFullYear()} Bar do Dauteno — Todos os direitos reservados.</p>
            </div>
        </footer>
    )
}


export default Footer