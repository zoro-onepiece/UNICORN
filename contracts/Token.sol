// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;
import "hardhat/console.sol";

contract Token{
    string public name;
    string public symbol;
    uint256 public decimals = 18;
    uint256 public totalSupply;

    // this mapping stores balance of address assoc iated with it 
    mapping(address => uint256) public balanceOf;
    // this allowance mapping is used to keep track of how much an owner allows a spender to spend on their behalf
    mapping(address => mapping(address => uint256)) public allowance;

    constructor(string memory _name, string memory _symbol,  uint256 _totalSupply){
        name = _name;
        symbol = _symbol;
        totalSupply = _totalSupply;
        balanceOf[msg.sender] = totalSupply;
    }  
    
    event Transfer(
        address indexed from,
        address indexed to,
        uint256 value
    );  

    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );


    function transfer(address _to, uint256 _value)public returns (bool success)
        {   
            require(balanceOf[msg.sender] >= _value);
            require(_to != address(0));

            balanceOf[msg.sender] -= _value;
            balanceOf[_to] += _value; 
            emit Transfer(msg.sender, _to, _value);
            return true;
        }


        function approve(address _spender, uint256 _value)
        public
        returns (bool success){
            require(_spender!= address(0));
            allowance[msg.sender][_spender] = _value;
            emit Approval(msg.sender ,_spender, _value);
            return true;
        }


    function transferFrom(address _from,address _to,uint256 _value
) public returns (bool success) {
    console.log(_from, _to, _value);
    
    require(_value <= balanceOf[_from], "Insufficient balance");
    
    // Check if allowance is sufficient
    require(_value <= allowance[_from][msg.sender], "Allowance exceeded");
    
    // Update allowance (subtract the transferred amount)
    allowance[_from][msg.sender] -= _value;
    
    // Transfer tokens
    balanceOf[_from] -= _value;
    balanceOf[_to] += _value;
    
    // Emit transfer event if you have one   
    emit Transfer(_from, _to, _value);
    
    return true;
}

} 