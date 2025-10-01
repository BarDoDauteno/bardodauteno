import React from 'react'
import { Link } from 'react-router-dom'


const Header: React.FC = () => {
    return (
        <header>
            <div className="inner">
                <h1>Bar do Dauteno</h1>
                <nav>
                    <Link to="/">Home</Link>
                    <Link to="/">Sobre</Link>
                    <a href="#contact">Contato</a>
                </nav>
            </div>
        </header>
    )
}


export default Header